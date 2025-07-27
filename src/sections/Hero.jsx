import GradientSpheres from "../components/GradientSpheres";
import HeroExperience from "../components/HeroExperience";
import { useState, useEffect } from "react";

const Hero = () => {
  const [showTouchHint, setShowTouchHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile/touch capable
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isMobileScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Show hint for mobile users after a delay
    if (isMobile) {
      const timer = setTimeout(() => {
        setShowTouchHint(true);
        // Auto-hide after 4 seconds
        setTimeout(() => setShowTouchHint(false), 4000);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

  return (
    <section
      id="home"
      className="w-screen h-dvh overflow-hidden relative text-white-50 md:p-0 px-5"
    >
      <div className="gradient-box w-full h-96 absolute bottom-0 left-0 z-20"></div>
      <GradientSpheres
        sphere1Class="gradient-sphere sphere-1"
        sphere2Class="gradient-sphere sphere-2"
      />

      <div className="w-full h-full flex-center">
        <div className="container relative w-full h-full">
          <div className="md:mt-40 mt-20">
            <p className="font md:text-2xl text-base">
              👋 Hey, I&apos;m Here
            </p>
            <h1 className="font-bold md:text-9xl text-5xl">GUEYA OUDJIT</h1>
            <h1 className="font-bold md:text-9xl text-5xl">CREATIVE</h1>
          </div>
          <div className="absolute w-full z-30 bottom-20 right-0">
            <div className="flex justify-between items-end">
              <div className="flex flex-col items-center md:gap-5 gap-1">
                <p className="md:text-base text-xs">Explore</p>
                <img
                  src="images/arrowdown.svg"
                  alt="arrowdown"
                  className="size-7 animate-bounce"
                />
              </div>
              <div className="flex flex-col items-end">
                <img src="/images/shape.svg" alt="shape" />
                <h1 className="font-bold md:text-9xl text-5xl">DEVELOPER</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-full absolute top-0 left-0">
        <HeroExperience />
      </div>

      {/* Touch Hint for Mobile */}
      {isMobile && showTouchHint && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="bg-black bg-opacity-80 backdrop-blur-sm border border-white border-opacity-20 rounded-2xl px-6 py-4 flex items-center gap-3 animate-fadeIn">
            <div className="relative">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-2 border-white border-opacity-60 rounded-full animate-ping"></div>
            </div>
            <div className="text-white">
              <p className="text-sm font-medium">Touch & drag to interact</p>
              <p className="text-xs text-gray-300">Move your finger around the screen</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
