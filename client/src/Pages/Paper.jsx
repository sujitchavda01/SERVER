import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import Banner from "../components/Banner";

const Paper = () => {
  const { domain } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [evaluationStatus, setEvaluationStatus] = useState({});
  const [message, setMessage] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const role = user?.role;
  const evaluatorId = user?.uid;

  useEffect(() => {
    if (!token) return;

    const fetchPapers = async () => {
      try {
        const response = await fetch("https://backend.picet.in/api/get-paper-details", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        let data = await response.json();

        if (role === "evaluator") {
          data = data.filter(paper =>
            paper.EvaluatorAssignments?.some(assignment => assignment.User?.uid === evaluatorId)
          );
        }

        if (domain) {
          data = data.filter(paper => paper.domain.toLowerCase() === domain.toLowerCase());
        }

        setMessage(data.length ? "" : role === "admin" ? "No papers found." : "No assigned papers found.");

        const statusMapping = {};
        await Promise.all(data.map(async (paper) => {
          try {
            const res = await fetch(`https://backend.picet.in/api/check-if-rated/${paper.rid}`, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });
            const result = res.ok ? await res.json() : {};
            statusMapping[paper.rid] = result.message || "Pending";
          } catch {
            statusMapping[paper.rid] = "Pending";
          }
        }));

        setEvaluationStatus(statusMapping);
        setPapers(data);
      } catch (error) {
        console.error("Error fetching papers:", error);
        setMessage("Failed to load papers.");
      }
    };

    fetchPapers();
  }, [domain, location.pathname, role, evaluatorId, token]);

  const handleDownload = async (filename) => {
    if (!token) return alert("Unauthorized! Please log in.");
    try {
      const response = await fetch(`https://backend.picet.in/api/get-paper//${filename}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error fetching file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file");
    }
  };

  const handleDelete = async (rid) => {
    if (!token || role !== "admin") return;
    if (!window.confirm("Are you sure you want to delete this paper?")) return;
    try {
      const response = await fetch(`https://backend.picet.in/api/delete-research-paper/${rid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error deleting paper");
      setPapers(papers.filter(paper => paper.rid !== rid));
    } catch (error) {
      console.error("Error deleting paper:", error);
      alert("Failed to delete paper");
    }
  };

  return (
    <div>
      <Banner
        pageName={role === "admin" ? "Admin Panel" : "Evaluator Dashboard"}
        title={role === "admin" ? "All Research Papers" : "Assigned Papers"}
      />

      {message ? (
        <p style={{ color: "red", fontWeight: "bold" }}>{message}</p>
      ) : (
        <table border="1">
          <thead>
            <tr>
              <th>Paper Id</th>
              <th>Author</th>
              <th>Title</th>
              <th>Domain</th>
              <th>Paper File</th>
              {role === "evaluator" && <th>Evaluation Status</th>}
              {role === "admin" && <th>Rating</th>}
              {role === "admin" && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => {
              const ratings = paper.ResearchPaperRatings || [];
              const avgRating = ratings.length > 0
                ? (
                    ratings.reduce((sum, rating) =>
                      sum + (rating.q1 + rating.q2 + rating.q3 + rating.q4 + rating.q5) / 5,
                      0
                    ) / ratings.length
                  ).toFixed(2)
                : "Not Rated";

              return (
                <tr key={paper.rid}>
                  <td>{paper.rid}</td>
                  <td>{paper.author_name}</td>
                  <td>{paper.title}</td>
                  <td>{paper.domain}</td>
                  <td>
                    <button onClick={() => handleDownload(paper.paper_file)}>View File</button>
                  </td>
                  {role === "evaluator" && (
                    <td>
                      <button
                        style={{
                          backgroundColor: evaluationStatus[paper.rid] === "Completed" ? "#808080" : "#FFA500",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          padding: "5px 10px",
                          cursor: evaluationStatus[paper.rid] === "Completed" ? "not-allowed" : "pointer",
                        }}
                        disabled={evaluationStatus[paper.rid] === "Completed"}
                        onClick={() => {
                          if (evaluationStatus[paper.rid] !== "Completed") {
                            navigate(`/evaluate/${paper.rid}`);
                          }
                        }}
                      >
                        {evaluationStatus[paper.rid] || "Pending"}
                      </button>
                    </td>
                  )}
                  {role === "admin" && <td>{avgRating}</td>}
                  {role === "admin" && (
                    <td>
                      <button style={{ backgroundColor: "red", border: "none", cursor: "pointer" }} onClick={() => handleDelete(paper.rid)}>
                        <FaTrash color="white" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Paper;