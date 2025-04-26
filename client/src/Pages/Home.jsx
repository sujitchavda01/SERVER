import React from "react";
import { Link } from "react-router-dom";
import Banner from "../components/Banner.jsx";
import "../Styles/Home.css";
import "../Styles/GlobalStyle.css"

// React Icons:
import { FaBrain } from "react-icons/fa6"; // Artificial Intelligence
import { FaMicrochip } from "react-icons/fa6"; // Nanotechnology
import { BsRobot } from "react-icons/bs"; // Robotics and Automation
import { PiPlantFill } from "react-icons/pi"; // Sustainable Engineering
import { MdOutlineInsertChart, MdOutlineSecurity } from "react-icons/md"; // Process Modelling, Cybersecurity
import { HiOutlineLightBulb } from "react-icons/hi"; // Computational Intelligence

const Home = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  const tracks = [
    {
      icon: <FaBrain />,
      title: "Artificial Intelligence and Machine Learning",
      link:
        role === "admin"
          ? "admin/papers/category/Artificial Intelligence and Machine Learning"
          : "evaluator/papers/category/Artificial Intelligence and Machine Learning",
    },
    {
      icon: <HiOutlineLightBulb />,
      title: "Computational and Cognitive Intelligence",
      link:
        role === "admin"
          ? "admin/papers/category/Computational and Cognitive Intelligence"
          : "evaluator/papers/category/Computational and Cognitive Intelligence",
    },
    {
      icon: <FaMicrochip />,
      title: "Nano Technology",
      link:
        role === "admin"
          ? "admin/papers/category/Nano Technology"
          : "evaluator/papers/category/Nano Technology",
    },
    {
      icon: <PiPlantFill />,
      title: "Sustainable Engineering",
      link:
        role === "admin"
          ? "admin/papers/category/Sustainable Engineering"
          : "evaluator/papers/category/Sustainable Engineering",
    },
    {
      icon: <MdOutlineInsertChart />,
      title: "Process Modelling and Simulation",
      link:
        role === "admin"
          ? "admin/papers/category/Process Modelling and Simulation"
          : "evaluator/papers/category/Process Modelling and Simulation",
    },
    {
      icon: <MdOutlineSecurity />,
      title: "Cybersecurity and Blockchain",
      link:
        role === "admin"
          ? "admin/papers/category/Cybersecurity and Blockchain"
          : "evaluator/papers/category/Cybersecurity and Blockchain",
    },
    {
      icon: <BsRobot />,
      title: "Robotics and Automation",
      link:
        role === "admin"
          ? "admin/papers/category/Robotics and Automation"
          : "evaluator/papers/category/Robotics and Automation",
    },
  ];

  return (
    <div>
      <Banner pageName="Home" title="Research Paper Tracks" />

      <div class="main-container">
    <div class="left-section">
        <div class="header-logo">
            <img src="Assets/Parul logo.png" alt="Parul University" class="parul-logo" />
            <div class="logo-title">
                <h1>Parul University</h1>
                <h1>International Conference on</h1>
                <h1>Engineering and Technology</h1>
                <h1>(PICET 2025)</h1>
            </div>
              <h2>Future Trends in Computing Systems and </h2>
              <h2>Innovations in Sustainable Engineering</h2>
        </div>
        <div class="powered-by">
            <h3>Powered By</h3>
            <img src="Assets/IET.png" alt="IET" class="powered-logo" />
        </div>
    </div>
    <div class="right-section">
        <div class="partners-section">
            <div class="partner-images">
                <img src="Assets/goals.JPG" alt="Goals" class="goal-img" />
                <img src="Assets/logo_picet.png" alt="PICET" class="picet-logo" />
            </div>
            <h3>Associated Partners</h3>
            <div class="partners-container">
                <img src="Assets/einfo.png" alt="eInfochips" />
                <img src="Assets/middlesex university.jpeg" alt="MiddleSex University" />
                <img src="Assets/Barodaweb.jpg" alt="Barodaweb" />
                <img src="Assets/IDS.png" alt="IDS" />
                <img src="Assets/penza.jpeg" alt="Penza State University"/>
                <img src="Assets/CyberNgo.png" alt="CyberNgo" />
                
            </div>
        </div>
    </div>
</div>

      <div className="grid-container">
        <div className="item item1">
          <img src="Assets/Home.png" alt="Homepage" />
        </div>

        <div className="item item2">
          <h2 className="page-title">Conference Tracks</h2>
          <div className="tracks-grid">
            {tracks.map((track, index) => (
              <Link to={track.link} key={index} className="track-card">
                <span className="track-icon">{track.icon}</span>
                <p className="track-title">{track.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
