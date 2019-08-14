(ns app
  (:require [clojure.core.matrix :as m]
            [clojure.core.matrix.linear :as ml]
    ;["fs" :as fs]
            [cljs.reader :as reader]
            ["geolib" :as geo]
            [goog.string :as gstring]
            [goog.string.format]
            ))


(defn reload! []
  (println "Code updated."))

(defn main! []
  (js/console.log "ASD"))

(defn geo-distance [a b]
  (let [[[a-latitude a-longitude] [b-latitude b-longitude]]
        (if (vector? a)
          [a b]
          [[(:latitude a) (:longitude b)] [(:latitude b) (:longitude b)]])]
    (geo/getPreciseDistance
      #js {:latitude a-latitude :longitude a-longitude}
      #js {:latitude b-latitude :longitude b-longitude}
      0.01)))

(defn linspace [a b n]
  (map
    (fn [i] (m/add a (m/mul (- b a) (/ i (dec n)))))
    (range n)))

(defn catmull-rom-spline [n p0 p1 p2 p3]
  (let [dims (count p0)
        alpha 0.5
        distance (fn [Pi Pj]
                   (println "X" Pi Pj (geo-distance Pi Pj) (+ (geo-distance Pi Pj)
                                                              (js/Math.pow (- (nth Pi 2) (nth Pj 2)) 2) ;; height
                                                              ))
                   (js/Math.sqrt
                     (+ (geo-distance Pi Pj)
                        (js/Math.pow (- (nth Pi 2) (nth Pj 2)) 2) ;; height
                        ))
                   #_(ml/norm (take 2 (m/sub Pi Pj)))
                   )
        tj (fn [ti Pi Pj]
             (+ (js/Math.pow (js/Math.max 0.0001 (distance Pi Pj))
                             alpha)
                ti))
        t0 0
        t1 (tj t0 p0 p1)
        t2 (tj t1 p1 p2)
        t3 (tj t2 p2 p3)
        t (linspace t1 t2 n)
        _ (println "t" t)

        Ax (fn [p0 p1 t0 t1]
             (m/add
               (mapv
                 (fn [t p0] (m/mul t p0))
                 (m/div (m/sub t1 t)
                        (- t1 t0))
                 (m/broadcast p0 [n dims])
                 )
               (mapv
                 (fn [t p1] (m/mul t p1))
                 (m/div (m/sub t t0)
                        (- t1 t0))
                 (m/broadcast p1 [n dims]))))
        A1 (Ax p0 p1 t0 t1)
        A2 (Ax p1 p2 t1 t2)
        A3 (Ax p2 p3 t2 t3)

        B1 (Ax A1 A2 t0 t2)
        B2 (Ax A2 A3 t1 t3)

        C (Ax B1 B2 t1 t2)
        ]
    C
    ))

(defn write-file [& args]
  ;(apply fs/writeFile args)
  )

#_(defn write-file [s file]
    (write-file file s (fn [])))

(defn to-csv [points & [file]]
  (let [s (->> points
               (map #(clojure.string/join ", " %))
               (clojure.string/join "\n"))]
    (write-file (or file "p.csv") s (fn []))))


(defn parse-coords [x]
  (when x
    (let [ref (last x)
          [deg min] (map reader/read-string (.split (.replace x #".$" "") ","))]
      (*
        (+ deg
           (/ min 60))
        (if (#{"S" "W"} ref) -1 1)))))


(defn find-exif-tag [tag exif]
  (second (re-find (js/RegExp (str "<" tag ">(.*)</")) exif)))

(defn parse-exif [exif]
  (let [latitude-str (find-exif-tag "exif:GPSLatitude" exif)
        latitude (parse-coords latitude-str)

        longitude-str (find-exif-tag "exif:GPSLongitude" exif)
        longitude (parse-coords longitude-str)
        ]
    {:latitude latitude
     :longitude longitude
     :altitude (reader/read-string (find-exif-tag "Camera:AboveGroundAltitude" exif))
     :yaw (reader/read-string (find-exif-tag "drone-parrot:DroneYawDegree" exif))
     :pitch (let [p (find-exif-tag "drone-parrot:CameraPitchDegree" exif)]
              (if (and p (re-matches #"-?\d+\.?\d*" p))
                (- (reader/read-string p))
                (rand-int 10)))
     }))

(defn coords-to-xy [p]
  [(:latitude p) (:longitude p)])

(defn coords-to-xyz [p]
  [(:latitude p) (:longitude p) (:altitude p)])

(defn mapcat-skip [f coll]
  (let [res (map f coll)]
    (concat (mapcat butlast res) [(last (last res))])
    ))

(defn extrapolate-keypoints [a b]
  (-> a
      (update :longitude #(- % (- (:longitude b) %)))
      (update :latitude #(- % (- (:latitude b) %)))
      (update :altitude #(- % (- (:altitude b) %)))
      ))

(def middlepoints 8)                                        ;; 8


(defn quad-easing [x]
  (let [t (* x 2)]
    (if (< t 1.0)
      (* 0.5 t t)
      (* -0.5 (- (* (- t 1)
                    (- t 3))
                 1)))))

(defn yaw-interpolate [a b n]
  (map
    (fn [i]
      (m/add a
             (m/mul (- b a)
                    (quad-easing (/ i (dec n)))
                    )))
    (range n)))

(defn calc-segment [p0 p1 p2 p3]
  (let [keypoints [p0 p1 p2 p3]
        yaws-keys (map :yaw keypoints)
        yaws-keys (reductions
                    (fn [prev next]
                      (let [diff (- next (mod prev 360))
                            diff (if (< 180 (js/Math.abs diff))
                                   (if (pos? diff) (- 360 diff) (+ 360 diff))
                                   diff)]
                        (+ prev diff)))
                    yaws-keys)
        pitchs-keys (map :pitch keypoints)
        coords (apply catmull-rom-spline middlepoints (map #(vec (concat (coords-to-xyz %1) [%2 %3])) keypoints yaws-keys pitchs-keys))

        yaws (->> #_(apply catmull-rom-spline middlepoints (map-indexed (fn [i p] [i p]) yaws-keys))
               ;(map #(nth % 3) coords)
               (yaw-interpolate (nth yaws-keys 1) (nth yaws-keys 2) middlepoints)
               ;(map second)
               (map (fn [x]                                 ;; normalize rotation
                      (let [a (mod x 360)]
                        (if (> a 180) (- a 360) a)))))

        ;pitchs (map second (apply catmull-rom-spline middlepoints (map-indexed (fn [i p] [i p]) pitchs-keys)))
        pitchs (map #(nth % 4) coords)

        distances (map (fn [[a b]]
                         (geo-distance a b))
                       (partition 2 1 coords))
        distance (reduce + distances)
        res {:points
             (map
               (fn [[lat lon alt] yaw pitch]
                 {:latitude lat
                  :longitude lon
                  :altitude alt
                  :yaw yaw
                  :pitch pitch
                  })
               coords yaws pitchs)
             :segment-length distance}]
    ;;(js/console.log "RES " res)
    res))

(defn calc-tajectory [keypoints loop]
  (let [keypoints (if loop
                    (concat [(last keypoints)] keypoints [(first keypoints) (second keypoints)])
                    (concat [(extrapolate-keypoints (first keypoints) (second keypoints))]
                            keypoints
                            [(extrapolate-keypoints (last keypoints) (last (butlast keypoints)))]))
        _ (mapv println keypoints)
        intervals (partition 4 1 keypoints)
        segments (map #(apply calc-segment %) intervals)
        points (mapcat-skip :points segments)
        distances (cons 0
                        (map (fn [[a b]]
                               (geo-distance a b))
                             (partition 2 1 points)))
        res {:segments segments
             :points (->> points
                          (map #(assoc %2 :dist-to-prev %1) distances))}]
    res))



#_(defn to-vis [points]
  (to-csv (map coords-to-xy points) "p.csv")
  (to-csv (map coords-to-xy keypoints) "keys.csv")
  (to-csv (map (fn [x]
                 (let [a (* (:yaw x) (/ js/Math.PI 180))
                       len 0.00001
                       dx (* len (js/Math.cos a))
                       dy (* len (js/Math.sin a))]
                   (concat (coords-to-xy x) [dx dy])))
               points)
          "vec.csv")
  )


(def max-speed 10.0)
(def max-vertical-speed 4.0)

(defn make-filght-plan [segments flight-speed rotation-speed]
  (let [change-speed (fn [v] [178 0 v -1 0 0 0 0])
        waypoint (fn [p & [hold]] [16 (or hold 0) "0.500000" "0.0" (:yaw p) (:latitude p) (:longitude p) (:altitude p)])
        camera-pitch (fn [angle speed] [2800 "0.000000" (gstring/format "%.6f" (- angle)) "0.000000" (gstring/format "%.6f" (js/Math.min speed 90)) "0.000000" "0.000000" "0.000000"])
        pitch-distances (->> segments
                             (map #(-> % :points last :pitch))
                             (cons (-> segments first :points first :pitch))
                             (partition 2 1)
                             (map (fn [[prev current]]
                                    (- current prev))))

        first-point (-> segments first :points first)
        last-point (-> segments last :points last)

        plan (concat
               [(change-speed 8)
                [50000 1 -1 0 0 0 0 0]                      ;; smooth yaw transition
                ;[24 0 0 1 0 0 0 1] ;; take off
                (waypoint first-point "2.000000")
                (camera-pitch (:pitch first-point) 90)
                (waypoint first-point "2.000000")
                [2500 0 30 0 0 0 0 0]                       ;; start video
                ]

               (mapcat (fn [{:keys [segment-length points]} pitch-distance]

                         (let [vertical-diff (js/Math.abs (- (:altitude (first points))
                                                             (:altitude (last points))))
                               yaw-diff (js/Math.abs (- (:yaw (first points))
                                                        (:yaw (last points))))
                               yaw-diff (if (> yaw-diff 180) (- 360 yaw-diff) yaw-diff)
                               pitch-diff (js/Math.abs (- (:pitch (last points)) (:pitch (first points))))

                               flight-time (/ segment-length flight-speed)
                               climb-time (/ vertical-diff max-vertical-speed)
                               horizonal-rotation (/ yaw-diff rotation-speed)
                               vertical-rotation (/ pitch-diff rotation-speed)
                               time (max flight-time climb-time horizonal-rotation vertical-rotation 1.0)
                               speed (/ segment-length time)
                               ]

                           (concat
                             [(change-speed speed)
                              (camera-pitch pitch-distance (/ pitch-diff (- time 0.5)))]
                             (map waypoint (rest points)))))
                       segments
                       pitch-distances)


               [(waypoint last-point "2.000000")
                [2501 0 0 0 0 0 0 0]                        ;; stop video
                ])
        txt (->> plan
                 (map-indexed (fn [i p]
                                (clojure.string/join "\t" (concat [i 0 3] p [1]))))
                 (clojure.string/join "\n"))]
    (print txt)
    (str "QGC WPL 120\n" txt)))

;; app scheme: com.parrot.freeflight3://

#_ (def exports
    #js {:parseMetadata (comp clj->js parse-exif)

         })

(def parseMetadata (comp clj->js parse-exif))
(def tajectory (fn [x loop] (clj->js (calc-tajectory (js->clj x :keywordize-keys true) loop))))
(def makeFlightPlan (fn [x flight-speed rotation-speed] (make-filght-plan (js->clj x :keywordize-keys true) flight-speed rotation-speed)))

; sphinx /opt/parrot-sphinx/usr/share/sphinx/worlds/outdoor_1.world anafi4k.drone::sdcard_serial=60A44C413AC0BEA16991005B