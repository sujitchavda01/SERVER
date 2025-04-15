import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../Styles/Evaluate.css';
import Banner from '../components/Banner';

const EditResearchPaperRating = () => {
    const { rid } = useParams();
    const navigate = useNavigate();
    const [ratings, setRatings] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' });
    const [recommendBestPaper, setRecommendBestPaper] = useState('no'); // Default to 'no'
    const [loading, setLoading] = useState(true);
    const [totalScore, setTotalScore] = useState(null);

    useEffect(() => {
        const fetchAssignedPapers = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Unauthorized: No token found');

                const response = await fetch('https://backend.picet.in/api/assigned-papers', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('Invalid data format received');

                const paper = data.find(paper => paper.rid === parseInt(rid));
                if (paper && Array.isArray(paper.score) && paper.score.length === 5) {
                    const updatedRatings = {
                        q1: paper.score[0].toString(),
                        q2: paper.score[1].toString(),
                        q3: paper.score[2].toString(),
                        q4: paper.score[3].toString(),
                        q5: paper.score[4].toString(),
                    };
                    setRatings(updatedRatings);
                    setTotalScore(paper.total_score); // Use total_score from API response
                    
                    // Set recommendBestPaper based on API response value
                    setRecommendBestPaper(paper.recommend_best_paper ? 'yes' : 'no'); 
                }
            } catch (error) {
                console.error('Error fetching assigned papers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignedPapers();
    }, [rid]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedRatings = { ...ratings, [name]: value };
        setRatings(updatedRatings);

        if (Object.values(updatedRatings).every(val => val !== '')) {
            const score = Object.values(updatedRatings).reduce((acc, val) => acc + parseInt(val, 10), 0);
            setTotalScore(score);
        }
    };

    const handleRecommendChange = (e) => {
        setRecommendBestPaper(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Unauthorized: No token found');

            const response = await fetch('https://backend.picet.in/api/edit-rating', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rid: parseInt(rid),
                    ...Object.fromEntries(Object.entries(ratings).map(([key, value]) => [key, parseInt(value)])),
                    totalScore,
                    recommend_best_paper: recommendBestPaper === 'yes'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Unknown error');
            }

            alert('Research Paper Rating Updated Successfully!');
            navigate('/evaluator/papers');
        } catch (error) {
            alert(`Error updating rating: ${error.message}`);
            console.error('Submit error:', error);
        }
    };

    return (
        <div>
            <Banner title="Research Paper" pageName="Edit Evaluation" />
            <div className="evaluate-container">
                {loading ? <p>Loading...</p> : (
                    <form onSubmit={handleSubmit}>
                        {["Presenter's effectiveness in conveying research details",
                          "Originality, significance, and contribution of research",
                          "Structure, logical flow, and clarity of the presentation",
                          "Communication skills, teamwork, and visual aids usage",
                          "Organization, section sequence, and time management effectiveness"]
                        .map((question, index) => (
                            <div className="form-group" key={index}>
                                <label>{question}</label>
                                <select
                                    name={`q${index + 1}`}
                                    value={ratings[`q${index + 1}`]}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select a Rating</option>
                                    {[5, 4, 3, 2, 1, 0].map(num => (
                                        <option key={num} value={num}>{`${num} - ${['Absent', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][num]}`}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                        <div className="form-group">
                            <label>Do you want to recommend this paper as the best paper?</label>
                            <select value={recommendBestPaper} onChange={handleRecommendChange} required>
                                <option value="">Select an Option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        {totalScore !== null && (
                            <div className="total-score">
                                <h3>Total Score: {totalScore}</h3>
                            </div>
                        )}
                        <button type="submit" className="button button-medium">Update Ratings</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EditResearchPaperRating;
