import Navbar from "./components/navbar";
import Hero from "./components/hero";
import Resume from "./components/resume";
import Projects from "./components/projects";
import Connect from "./components/connect";

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Resume />
        <Projects />
        <Connect />
      </main>
    </>
  );
}