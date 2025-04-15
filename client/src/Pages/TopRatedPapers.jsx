import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/TopRatedPapers.css";
import "../Styles/GlobalStyle.css";

const TopRatedPapers = () => {
    const [papers, setPapers] = useState([]); // Array to hold assigned papers
    const [selectedPapers, setSelectedPapers] = useState({ r1: "", r2: "", r3: "" }); // Using keys for ranks
    const [loading, setLoading] = useState(true); // Loading state
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) throw new Error("Unauthorized: No token found");

                const response = await fetch("http://69.62.76.50:5000/api/assigned-papers", {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

                const data = await response.json();
                console.log("Assigned Papers:", data);
                setPapers(data); // Store fetched papers in state
            } catch (error) {
                console.error("Error fetching papers:", error); // Log any errors
                alert("Failed to fetch assigned papers. Please try again."); // Alert user
            } finally {
                setLoading(false); // Set loading to false after fetch attempt
            }
        };

        fetchPapers(); // Call fetch function
    }, []);

    const handleRankChange = (rank, paperId) => {
        setSelectedPapers(prev => {
            const updatedSelection = { ...prev };

            // Ensure no duplicate selections
            if (Object.values(updatedSelection).includes(paperId)) {
                alert("This paper is already selected for another rank.");
                return prev;
            }

            // Update the selected paper for the specific rank
            updatedSelection[rank] = paperId;

            // Clear previous selections for the same paper in other ranks
            for (let r in updatedSelection) {
                if (r !== rank && updatedSelection[r] === paperId) {
                    updatedSelection[r] = ""; // Clear the previous selection in other ranks
                }
            }

            return updatedSelection; // Return updated selections
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Collect the selected paper IDs in the expected format
        const { r1, r2, r3 } = selectedPapers; // Extract values directly
        const payload = { r1, r2, r3 }; // Create payload

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Unauthorized: No token found");

            // Fetch assigned papers
            const assignedPaperIds = papers.map(paper => paper.rid.toString()); // Ensure IDs are strings

            console.log("Assigned Paper IDs:", assignedPaperIds); // Debugging: log assigned paper IDs
            console.log("Selected Paper IDs:", payload); // Debugging: log selected paper IDs

            // Check for invalid papers
            const invalidPapers = Object.values(payload).filter(rid => rid && !assignedPaperIds.includes(rid));
            console.log("Invalid Papers:", invalidPapers); // Log invalid papers for debugging

            if (invalidPapers.length > 0) {
                alert("Some selected papers are not assigned to you.");
                return;
            }

            // Sending papers in the expected format
            const response = await fetch("http://69.62.76.50:5000/api/select-top-papers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload) // Send the payload directly
            });

            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.message || "Failed to submit rankings");

            alert("Top Rated Papers Submitted Successfully!");
            await generateReport();
            navigate("/"); // Navigate after successful submission
        } catch (error) {
            alert(`Error: ${error.message}`); // Alert user of the error
            console.error("Submit error:", error); // Log any submission errors
        }
    };

    const generateReport = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Unauthorized: No token found");

            const response = await fetch("http://69.62.76.50:5000/api/download-report", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Error generating report");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Session Report.pdf"; // Specify the file name for the download
            document.body.appendChild(a);
            a.click(); // Trigger the download
            window.URL.revokeObjectURL(url); // Clean up
        } catch (error) {
            alert(`Error generating report: ${error.message}`); // Alert user of the error
            console.error("Report error:", error); // Log any report generation errors
        }
    };

    return (
        <div className="top-rated-container">
            <h2 className="page-title">Top Rated Research Papers</h2>
            {loading ? <p>Loading...</p> : ( // Display loading message while fetching
                <form onSubmit={handleSubmit}>
                    {["r1", "r2", "r3"].map((rank, index) => (
                        <div className="form-group" key={index}>
                            <label className="rating-label">Suggest Rank {index + 1}</label>
                            <select className="ranking-select"
                                value={selectedPapers[rank]} // Controlled component
                                onChange={(e) => handleRankChange(rank, e.target.value)} // Handle rank change
                            >
                                <option value="">Select a Research Paper</option>
                                {papers
                                    .filter(paper => !Object.values(selectedPapers).includes(paper.rid) || selectedPapers[rank] === paper.rid)
                                    .map(paper => (
                                        <option key={paper.rid} value={paper.rid}>
                                            {paper.rid} - {paper.title} // Display paper ID and title
                                        </option>
                                    ))}
                            </select>
                        </div>
                    ))}
                    <button type="submit" className="button button-medium">Submit Rankings</button>
                </form>
            )}
        </div>
    );
};

export default TopRatedPapers;
