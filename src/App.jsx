import {
  Loader,
  NavBar,
  Sidebar,
  Hero,
  About,
  TechStack,
  Projects,
  Testimonials,
  Footer,
  Contact,
} from "./sections";

const App = () => {
  return (
    <div className="bg-black">
      <Loader />
      <NavBar />
      <Sidebar />
      <Hero />
      <About />
      <TechStack />
      <Projects />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
};

export default App;
