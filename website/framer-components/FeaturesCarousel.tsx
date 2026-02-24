import { motion, AnimatePresence, PanInfo } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"
import { useState, startTransition } from "react"

/**
 * Features Card Carousel for ginko website
 *
 * @framerDisableUnlink
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 450
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

// Sunset gradient colors for dots and card numbers
const SUNSET_COLORS = [
    "#FDC400", // Yellow
    "#FC9500", // Orange
    "#FE4500", // Red
    "#E00256", // Violet
    "#A70086", // Purple
    "#271D26", // Purple-Black
    "#0B0B0B", // Black
]

// Feature data
const FEATURES = [
    {
        number: "01",
        title: "ginko start",
        tagline: "Ready Player YOU",
        description: "ginko start loads your session context with tasks, goals, knowledge, and everything important you did in your last session. No more re-explaining the basics to your AI partner, just straight back to flow in 30 seconds or less."
    },
    {
        number: "02",
        title: "ginko charter",
        tagline: "Your Blueprint For Success",
        description: "ginko charter gives your AI partner the big picture: project goals, audiences, pain-points, architecture, scope, acceptance criteria and more, all using natural conversation."
    },
    {
        number: "03",
        title: "ginko epic",
        tagline: "WHY-WHAT-HOW",
        description: "ginko epic creates your work breakdown structure from your charter, knowledge docs, and conversation with you. Epics are broken down into sprints and tasks to keep your work on track."
    },
    {
        number: "04",
        title: "ginko vibecheck",
        tagline: "Take A Beat",
        description: "ginko vibecheck is a built-in behavior that gives you and your AI partner a blame-free moment to challenge approach and pivot back to flow. Simply call \"vibecheck\" whenever things seem off."
    },
    {
        number: "05",
        title: "ginko insights",
        tagline: "Level Up",
        description: "ginko insights analyzes your session logs, commits, and other data to pinpoint exactly where you are effective and where you have opportunities to improve."
    },
    {
        number: "06",
        title: "ginko handoff",
        tagline: "We'll Take It From Here",
        description: "ginko handoff handles all the end-of-session housekeeping in a single command. Git commits, temp-file cleanup, doc updates and more are all taken care of."
    },
    {
        number: "07",
        title: "ginko collaboration graph",
        tagline: "Get Real, In Real Time",
        description: "AI-driven development takes days, not weeks. Fast-moving teams need real-time updates on task completion, issues, and insights. Ginko collaboration graph keeps everyone in sync."
    },
]

export default function FeaturesCarousel(props) {
    const {
        style,
        autoPlay = false,
        autoPlayInterval = 5000,
        showArrows = true,
        showDots = true,
    } = props

    const [currentIndex, setCurrentIndex] = useState(0)
    const [direction, setDirection] = useState(0)

    const goToSlide = (index: number) => {
        startTransition(() => {
            setDirection(index > currentIndex ? 1 : -1)
            setCurrentIndex(index)
        })
    }

    const goToPrevious = () => {
        startTransition(() => {
            setDirection(-1)
            setCurrentIndex((prev) => (prev === 0 ? FEATURES.length - 1 : prev - 1))
        })
    }

    const goToNext = () => {
        startTransition(() => {
            setDirection(1)
            setCurrentIndex((prev) => (prev === FEATURES.length - 1 ? 0 : prev + 1))
        })
    }

    // Swipe handling
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipeThreshold = 50
        if (info.offset.x > swipeThreshold) {
            goToPrevious()
        } else if (info.offset.x < -swipeThreshold) {
            goToNext()
        }
    }

    const currentFeature = FEATURES[currentIndex]
    const currentColor = SUNSET_COLORS[currentIndex]

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -300 : 300,
            opacity: 0,
        }),
    }

    return (
        <div
            style={{
                ...style,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "24px",
                fontFamily: "'JetBrains Mono', monospace",
            }}
        >
            {/* Card Container */}
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "600px",
                    height: "320px",
                    overflow: "hidden",
                }}
            >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            cursor: "grab",
                        }}
                    >
                        {/* Card */}
                        <div
                            style={{
                                background: "#FAF8F0",
                                border: "2px solid #0B0B0B",
                                padding: "40px",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                boxSizing: "border-box",
                            }}
                        >
                            {/* Number */}
                            <div
                                style={{
                                    fontFamily: "'Anton', sans-serif",
                                    fontSize: "64px",
                                    lineHeight: 1,
                                    color: currentColor,
                                    marginBottom: "8px",
                                }}
                            >
                                {currentFeature.number}
                            </div>

                            {/* Title */}
                            <h3
                                style={{
                                    fontFamily: "'Anton', sans-serif",
                                    fontSize: "32px",
                                    color: "#100D08", // Deep Warm Black
                                    margin: "0 0 4px 0",
                                    fontWeight: 400,
                                }}
                            >
                                {currentFeature.title}
                            </h3>

                            {/* Tagline */}
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "#FC9500",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    margin: "0 0 16px 0",
                                }}
                            >
                                {currentFeature.tagline}
                            </p>

                            {/* Description */}
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "#615F61",
                                    lineHeight: 1.7,
                                    margin: 0,
                                }}
                            >
                                {currentFeature.description}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                {/* Previous Arrow */}
                {showArrows && (
                    <button
                        onClick={goToPrevious}
                        style={{
                            width: "32px",
                            height: "32px",
                            border: "1px solid #0B0B0B",
                            background: "#FAF8F0",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0B0B0B"
                            e.currentTarget.style.color = "#FCFBF1"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#FAF8F0"
                            e.currentTarget.style.color = "#0B0B0B"
                        }}
                    >
                        ‹
                    </button>
                )}

                {/* Dots */}
                {showDots && (
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                        }}
                    >
                        {FEATURES.map((_, index) => (
                            <motion.button
                                key={index}
                                onClick={() => goToSlide(index)}
                                animate={{
                                    scale: currentIndex === index ? 1.3 : 1,
                                    opacity: currentIndex === index ? 1 : 0.4,
                                }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    background: SUNSET_COLORS[index],
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Next Arrow */}
                {showArrows && (
                    <button
                        onClick={goToNext}
                        style={{
                            width: "32px",
                            height: "32px",
                            border: "1px solid #0B0B0B",
                            background: "#FAF8F0",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0B0B0B"
                            e.currentTarget.style.color = "#FCFBF1"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#FAF8F0"
                            e.currentTarget.style.color = "#0B0B0B"
                        }}
                    >
                        ›
                    </button>
                )}
            </div>
        </div>
    )
}

FeaturesCarousel.defaultProps = {
    autoPlay: false,
    autoPlayInterval: 5000,
    showArrows: true,
    showDots: true,
}

addPropertyControls(FeaturesCarousel, {
    showArrows: {
        type: ControlType.Boolean,
        title: "Show Arrows",
        defaultValue: true,
    },
    showDots: {
        type: ControlType.Boolean,
        title: "Show Dots",
        defaultValue: true,
    },
    autoPlay: {
        type: ControlType.Boolean,
        title: "Auto Play",
        defaultValue: false,
    },
    autoPlayInterval: {
        type: ControlType.Number,
        title: "Interval (ms)",
        defaultValue: 5000,
        min: 1000,
        max: 10000,
        step: 500,
        hidden: (props) => !props.autoPlay,
    },
})
