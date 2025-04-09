import React from "react";
import "../Styles/Footer.css"

import { IoLogoInstagram } from "react-icons/io5";
import { RiTwitterFill } from "react-icons/ri";
import { FaFacebook } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa";
const Footer = () => {
  return (
    <footer className="footer">
      < div className="container"
         style={{
          backgroundImage: `url("/Assets/world-map-footer.png")`,
          backgroundSize: "65%", 
          backgroundPosition: "right top",
          backgroundRepeat: "no-repeat",
          filter:"brightness(125%)"
      }}
      >
        <div className="footer-section">
          <img src="/Assets/logo_picet.png" alt="PiCET" className="logo" />
          <p>
            The PiCET-2025 has an objective of creating an international forum
            for academicians, researchers, and scientists across the globe to
            discuss contemporary research status and advanced techniques to
            address challenges faced in emerging technologies in Engineering &
            its allied branches.
          </p>
          <div className="social-icons">
            <a href="https://www.instagram.com/paruluniversity/?hl=en"><IoLogoInstagram  fill="#0056b3"/></a>
            <a href="https://x.com/ParulUniversity?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor"><RiTwitterFill fill="#0056b3"/></a>
            <a href="https://www.facebook.com/ParulUniversity/"><FaFacebook fill="#0056b3"/></a>
            <a href="https://www.linkedin.com/school/paruluniversity/posts/?feedView=all"><FaLinkedin fill="#0056b3"/></a>
          </div>
        </div>

        <div className="developers">
  <h3>Designed & Developed By</h3>
  <div className="developer-list">
    <a href="https://www.linkedin.com/in/sujit-chavda/" target="_blank" rel="noopener noreferrer">
      <span>Mr. Sujit J. Chavda</span> <FaLinkedin className="linkedin-icon" />
    </a>
    <a href="https://www.linkedin.com/in/nishtha-sadariya-64514432a/" target="_blank" rel="noopener noreferrer">
      <span>Ms. Nishtha J. Sadariya</span> <FaLinkedin className="linkedin-icon" />
    </a>
    <a href="https://www.linkedin.com/in/anjali-nikumbe-6a8a44282/" target="_blank" rel="noopener noreferrer">
      <span>Ms. Anjali R. Nikumbhe</span> <FaLinkedin className="linkedin-icon" />
    </a>
  </div>
</div>


        <div className="developers">
          <h3>Guided By</h3>
            <p>Dr. Swapnil Parikh</p> 
            <p>Ms. Sumitra Menaria</p>
            <p>Mr. Mohit Rathod</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          &copy; Copyright <strong>PIT-CSE Parul University.</strong> All Rights Reserved
        </p>
      </div>
    </footer>
  );
};

export default Footer;