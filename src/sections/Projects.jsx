import TitleHeader from "../components/TitleHeader";
import Carousel from "../components/Carousel";
import GradientSpheres from "../components/GradientSpheres";

const Projects = () => {
  return (
    <section className="w-full h-full flex-center relative" id="projects">
      <GradientSpheres
        sphere1Class="projects-gradient-sphere projects-sphere-1"
        sphere2Class="projects-gradient-sphere projects-sphere-2"
      />

      <div className="w-full md:my-40 my-20 relative z-10">
        <div className="container mx-auto md:p-0 px-5">
          <TitleHeader
            title="Featured Projects"
            number="03"
            text="Explore my latest work - interactive web applications built with modern technologies"
          />
        </div>
        <div className="md:mt-20 mt-10">
          <Carousel />
        </div>
      </div>
    </section>
  );
};

export default Projects;
