const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, ResearchPaper,EvaluatorAssignment, ResearchPaperRating } = require('../models/model');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // For sending emails
const { Op } = require("sequelize");
const moment = require('moment');
const moment2 = require("moment-timezone");
const { Sequelize } = require("sequelize");


const pdf = require('html-pdf');


// Register
const register = async (req, res) => {
    try {
        const { email, password, name, domain } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email,
            password: hashedPassword,
            name,
            role: 'evaluator',
            domain,
            approval_status: 'pending'
        });

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};






const uploadEvaluators = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    
    if (sheetData.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'Excel file is empty' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    try {
        for (let row of sheetData) {
            const email = row["Email"]?.toString().trim();
            const name = row["Name"]?.toString().trim();
            const domain = row["Domain"]?.toString().trim();
            
            if (!email || !name || !domain) {
                return res.status(400).json({ message: 'Missing required fields: Email, Name, and Domain are mandatory' });
            }

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                // Check for changes in the existing user's data
                let updateRequired = false;
                const updates = {};

                if (existingUser.name !== name) {
                    updates.name = name;
                    updateRequired = true;
                }
                if (existingUser.domain !== domain) {
                    updates.domain = domain;
                    updateRequired = true;
                }

                if (updateRequired) {
                    await User.update(updates, { where: { email } });
                }
            } else {
                // Create a new user if it does not exist
                const password = Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(password, 10);

                await User.create({
                    email,
                    password: hashedPassword,
                    name,
                    role: 'evaluator',
                    domain,
                    approval_status: 'approved'
                });

                const mailOptions = {
                    from: `"PICET" <${process.env.EMAIL}>`,
                    to: email,
                    subject: 'Welcome to PICET',
                    html: `
                        <div style="max-width: 600px; width: 100%; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background: #ffffff;">
                            <div style="background: #0047ab; padding: 15px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h2 style="color: white; margin: 0; font-size: 22px;">Welcome to PICET</h2>
                            </div>
                            <div style="padding: 20px; text-align: left; color: #333;">
                                <p style="font-size: 16px; line-height: 1.5;">Dear ${name},</p>
                                <p style="font-size: 16px; line-height: 1.5;">We are pleased to welcome you to PICET.</p>
                                <p style="font-size: 16px; line-height: 1.5;">You have been successfully registered as an evaluator.</p>
                                
                                <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 15px 0;">
                                    <p style="font-size: 16px; font-weight: bold; color: #0047ab; margin: 0;">Your Login Credentials:</p>
                                    <p style="font-size: 16px; margin: 5px 0;"><strong>Email:</strong> <span style="color: #333;">${email}</span></p>
                                    <p style="font-size: 16px; margin: 5px 0;"><strong>Password:</strong> <span style="color: #333;">${password}</span></p>
                                </div>

                                <p style="font-size: 16px; line-height: 1.5;">Please log in and change your password as soon as possible.</p>
                                <div style="text-align: center; margin: 20px 0;">
                                    <a href="#" style="background: #0047ab; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block; width: 80%; max-width: 200px; text-align: center;">Login</a>
                                </div>
                                <p style="font-size: 16px; line-height: 1.5;">We look forward to your valuable contributions!</p>
                            </div>
                            <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #555; border-radius: 0 0 10px 10px;">
                                &copy; ${new Date().getFullYear()} PICET | All Rights Reserved
                            </div>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
            }
        }
        
        fs.unlinkSync(filePath); // Delete the uploaded file after processing
        res.status(200).json({ message: 'Evaluators uploaded and emails sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        fs.unlinkSync(filePath);  // Ensure file is deleted whether success or failure
    }
};








// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.approval_status === 'pending') {
            return res.status(403).json({ message: 'Your account is pending approval.' });
        } else if (user.approval_status === 'rejected') {
            return res.status(403).json({ message: 'Your account has been rejected.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { uid: user.uid, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Upload Research Paper
const uploadResearchPaper = async (req, res) => {
    try {

        const { rid, title, domain, author_name } = req.body;

        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        if (!rid || !title || !domain || !req.file || !author_name) {
            return res.status(400).json({ message: 'Paper ID, Author Name, Title, Domain, and file are required' });
        }

        const paper_file = req.file.filename; 

        // console.log("Final Data to be Inserted:", { rid, title, domain, paper_file, author_name });

        const newPaper = await ResearchPaper.create({
            rid,
            title,
            domain,
            paper_file,
            author_name
        });

        res.status(201).json({ message: 'Research paper uploaded successfully', researchPaper: newPaper });
    } catch (error) {
        console.error("Error uploading research paper:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


const assignEvaluator = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded. Please upload an Excel file." });
        }

        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

        if (sheetData.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: "Uploaded Excel file is empty." });
        }

        let insertedRecords = 0;
        let skippedRecords = 0;

        for (const row of sheetData) {
            let { rid, evaluator_email, session_start, session_end } = row;

            if (!rid || !evaluator_email || !session_start || !session_end) {
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    message: "Each row must contain rid, evaluator_email, session_start, and session_end.",
                });
            }

            const convertExcelDate = (excelDate) => {
                if (typeof excelDate === "number") {
                    const parsedDate = xlsx.SSF.parse_date_code(excelDate);
                    return moment.utc({
                        year: parsedDate.y,
                        month: parsedDate.m - 1,
                        day: parsedDate.d,
                        hour: parsedDate.H || 0,
                        minute: parsedDate.M || 0,
                        second: Math.floor(parsedDate.S) || 0
                    }).format("YYYY-MM-DD HH:mm:ss");
                }
                return moment.utc(excelDate, ["YYYY-MM-DD HH:mm:ss", "DD-MM-YYYY HH:mm:ss"]).format("YYYY-MM-DD HH:mm:ss");
            };

            session_start = convertExcelDate(session_start);
            session_end = convertExcelDate(session_end);

            const researchPaper = await ResearchPaper.findByPk(rid);
            if (!researchPaper) {
                fs.unlinkSync(filePath);
                return res.status(404).json({
                    message: `Research Paper with ID ${rid} not found.`,
                });
            }

            const evaluator = await User.findOne({
                where: { email: evaluator_email, role: "evaluator" },
            });
            if (!evaluator) {
                fs.unlinkSync(filePath);
                return res.status(404).json({
                    message: `Evaluator with email ${evaluator_email} not found.`,
                });
            }

            const existingAssignment = await EvaluatorAssignment.findOne({
                where: { rid: researchPaper.rid, uid: evaluator.uid },
            });

            if (existingAssignment) {
                if (existingAssignment.session_start !== session_start || existingAssignment.session_end !== session_end) {
                    existingAssignment.session_start = session_start;
                    existingAssignment.session_end = session_end;
                    await existingAssignment.save();
                    insertedRecords++;
                } else {
                    skippedRecords++;
                }
            } else {
                await EvaluatorAssignment.create({
                    rid: researchPaper.rid,
                    uid: evaluator.uid,
                    session_start,
                    session_end,
                });
                insertedRecords++;
            }
        }

        fs.unlinkSync(filePath);

        res.status(200).json({
            message: `Research papers assigned successfully.`,
            inserted: insertedRecords,
            skipped: skippedRecords,
        });
    } catch (error) {
        console.error("Error processing Excel file:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};






const deleteResearchPaper = async (req, res) => {
    try {
        const { rid } = req.params;

        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const paper = await ResearchPaper.findByPk(rid);
        if (!paper) {
            return res.status(404).json({ message: 'Research paper not found' });
        }

        const filePath = path.join(__dirname, '../Research Paper/', paper.paper_file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); 
        }

        await EvaluatorAssignment.destroy({ where: { rid } });
        await ResearchPaperRating.destroy({ where: { rid } });

        await paper.destroy();

        res.status(200).json({ message: 'Research paper deleted successfully' });
    } catch (error) {
        console.error('Error deleting research paper:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



// Get Papers
const getResearchPapers = async (req, res) => {
    try {
        const papers = await ResearchPaper.findAll({
            attributes: ['rid', 'title', 'author_name', 'paper_file', 'domain','post_date']
        });
        res.status(200).json(papers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Get Research Paper File 
const getResearchPaperFile = async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../Research Paper/', filename);

        // console.log("Requested File Path:", filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.download(filePath, filename, (err) => {
            if (err) {
                console.error("Error downloading file:", err);
                res.status(500).json({ message: 'Error downloading file' });
            }
        });
    } catch (error) {
        console.error("Error fetching research paper file:", error);
        res.status(500).json({ message: 'Server error' });
    }
};



const getEvaluators = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can view evaluators.' });
        }

        const evaluators = await User.findAll({
            where: {
                role: 'evaluator',
                approval_status: ['approved', 'pending', 'rejected']
            },
            attributes: ['uid', 'name', 'email', 'approval_status', 'domain', 'createdAt']
        });

        res.status(200).json(evaluators);
    } catch (error) {
        console.error('Error fetching evaluators:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};





const approveEvaluator = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can approve evaluators.' });
        }

        const { user_id } = req.params;
        const evaluator = await User.findByPk(user_id);

        if (!evaluator) {
            return res.status(404).json({ message: 'Evaluator not found' });
        }

        if (evaluator.role !== 'evaluator') {
            return res.status(400).json({ message: 'Only evaluator users can be approved.' });
        }

        evaluator.approval_status = 'approved';
        await evaluator.save();

        // Send welcome email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: `"PICET" <${process.env.EMAIL}>`,
            to: evaluator.email,
            subject: 'Welcome to PICET',
            html: `
                <div style="max-width: 600px; width: 100%; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background: #ffffff;">
                    <div style="background: #0047ab; padding: 15px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0; font-size: 22px;">Welcome to PICET</h2>
                    </div>
                    <div style="padding: 20px; text-align: left; color: #333;">
                        <p style="font-size: 16px; line-height: 1.5;">Dear ${evaluator.name},</p>
                        <p style="font-size: 16px; line-height: 1.5;">We are pleased to welcome you to PICET.</p>
                        <p style="font-size: 16px; line-height: 1.5;">You have been successfully registered as an evaluator.</p>

                        <p style="font-size: 16px; line-height: 1.5;">Please log in and change your password as soon as possible.</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="#" style="background: #0047ab; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block; width: 80%; max-width: 200px; text-align: center;">Login</a>
                        </div>
                        <p style="font-size: 16px; line-height: 1.5;">We look forward to your valuable contributions!</p>
                    </div>
                    <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #555; border-radius: 0 0 10px 10px;">
                        &copy; ${new Date().getFullYear()} PICET | All Rights Reserved
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: 'Evaluator approved successfully and welcome email sent.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};





const rejectEvaluator = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can reject evaluators.' });
        }

        const { user_id } = req.params;

        const evaluator = await User.findByPk(user_id);
        if (!evaluator) {
            return res.status(404).json({ message: 'Evaluator not found' });
        }

        if (evaluator.role !== 'evaluator') {
            return res.status(400).json({ message: 'Only evaluator users can be approved or rejected.' });
        }

        evaluator.approval_status = 'rejected';
        await evaluator.save();

        // Send rejection email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: `"PICET" <${process.env.EMAIL}>`,
            to: evaluator.email,
            subject: 'Application Status - PICET',
            html: `
                <div style="max-width: 600px; width: 100%; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background: #ffffff;">
                    <div style="background: #ab0000; padding: 15px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0; font-size: 22px;">Application Status - PICET</h2>
                    </div>
                    <div style="padding: 20px; text-align: left; color: #333;">
                        <p style="font-size: 16px; line-height: 1.5;">Dear ${evaluator.name},</p>
                        <p style="font-size: 16px; line-height: 1.5;">Thank you for your interest in joining PICET as an evaluator.</p>
                        <p style="font-size: 16px; line-height: 1.5;">After careful review, we regret to inform you that your application has been rejected.</p>
                        
                        <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 15px 0;">
                            <p style="font-size: 16px; font-weight: bold; color: #ab0000; margin: 0;">Status: Rejected</p>
                        </div>

                        <p style="font-size: 16px; line-height: 1.5;">If you have any questions or would like further clarification, please feel free to contact us.</p>
                        
                        <p style="font-size: 16px; line-height: 1.5;">We appreciate your time and effort, and we encourage you to apply again in the future.</p>
                    </div>
                    <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #555; border-radius: 0 0 10px 10px;">
                        &copy; ${new Date().getFullYear()} PICET | All Rights Reserved
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: 'Evaluator rejected successfully and email notification sent.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};





const rateResearchPaper = async (req, res) => {
    try {
        const evaluatorId = req.user.uid; 
        const { rid, recommend_best_paper } = req.body;
        const q1 = parseInt(req.body.q1);
        const q2 = parseInt(req.body.q2);
        const q3 = parseInt(req.body.q3);
        const q4 = parseInt(req.body.q4);
        const q5 = parseInt(req.body.q5);

        if (!rid || isNaN(q1) || isNaN(q2) || isNaN(q3) || isNaN(q4) || isNaN(q5)) {
            return res.status(400).json({ message: 'All fields are required and must be valid numbers.' });
        }

        if ([q1, q2, q3, q4, q5].some(score => score < 0 || score > 5)) {
            return res.status(400).json({ message: 'Scores must be between 0 and 5.' });
        }

        if (recommend_best_paper !== undefined && typeof recommend_best_paper !== 'boolean') {
            return res.status(400).json({ message: 'recommend_best_paper must be a boolean value.' });
        }

        const assignment = await EvaluatorAssignment.findOne({
            where: { rid, uid: evaluatorId }
        });

        if (!assignment) {
            return res.status(403).json({ message: 'You are not assigned to rate this research paper.' });
        }

        const existingRating = await ResearchPaperRating.findOne({
            where: { rid, uid: evaluatorId }
        });

        if (existingRating) {
            return res.status(400).json({ message: 'You have already rated this research paper.' });
        }

        await ResearchPaperRating.create({
            rid,
            uid: evaluatorId,
            q1,
            q2,
            q3,
            q4,
            q5,
            recommend_best_paper: recommend_best_paper || false
        });

        res.status(201).json({ message: 'Research paper rated successfully.' });

    } catch (error) {
        console.error("Error rating research paper:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};









const editResearchPaperRating = async (req, res) => {
    try {
        if (req.user.role !== "evaluator") {
            return res.status(403).json({ message: "Access denied. Only evaluators can edit ratings." });
        }

        const evaluatorId = req.user.uid;
        const { rid, recommend_best_paper } = req.body;
        const q1 = parseInt(req.body.q1);
        const q2 = parseInt(req.body.q2);
        const q3 = parseInt(req.body.q3);
        const q4 = parseInt(req.body.q4);
        const q5 = parseInt(req.body.q5);

        if (!rid || isNaN(q1) || isNaN(q2) || isNaN(q3) || isNaN(q4) || isNaN(q5)) {
            return res.status(400).json({ message: 'All fields are required and must be valid numbers.' });
        }

        if ([q1, q2, q3, q4, q5].some(score => score < 0 || score > 5)) {
            return res.status(400).json({ message: 'Scores must be between 0 and 5.' });
        }

        if (recommend_best_paper !== undefined && typeof recommend_best_paper !== 'boolean') {
            return res.status(400).json({ message: 'recommend_best_paper must be a boolean value.' });
        }

        const assignment = await EvaluatorAssignment.findOne({
            where: { rid, uid: evaluatorId }
        });

        if (!assignment) {
            return res.status(403).json({ message: 'You are not assigned to rate this research paper.' });
        }

        // Get current time in IST
        const currentTimeIST = moment2().tz("Asia/Kolkata");
        const sessionStartIST = moment2(assignment.session_start).tz("Asia/Kolkata");
        const sessionEndIST = moment2(assignment.session_end).tz("Asia/Kolkata");

        if (currentTimeIST.isBefore(sessionStartIST) || currentTimeIST.isAfter(sessionEndIST)) {
            return res.status(400).json({ message: 'You can only edit the rating during the session period.' });
        }

        const existingRating = await ResearchPaperRating.findOne({
            where: { rid, uid: evaluatorId }
        });

        if (!existingRating) {
            return res.status(400).json({ message: 'Rating not found. You must rate the paper first before editing.' });
        }

        await existingRating.update({
            q1, q2, q3, q4, q5,
            recommend_best_paper: recommend_best_paper !== undefined ? recommend_best_paper : existingRating.recommend_best_paper
        });

        res.status(200).json({ message: 'Research paper rating updated successfully.' });
    } catch (error) {
        console.error("Error editing research paper rating:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};










// Check if an evaluator has already rated an assigned research paper
const checkIfRated = async (req, res) => {
    try {
        const { rid } = req.params;
        const uid = req.user.uid; // Assuming evaluator is logged in

        // Validate if the research paper exists
        const researchPaper = await ResearchPaper.findOne({ where: { rid } }); // FIXED: Changed 'id' to 'rid'
        if (!researchPaper) {
            return res.status(404).json({ message: 'Invalid research paper ID' });
        }

        // Check if the evaluator has already rated the paper
        const rating = await ResearchPaperRating.findOne({ where: { rid, uid } });

        if (rating) {
            return res.status(200).json({ rated: true, message: 'Evaluation Completed' });
        } else {
            return res.status(200).json({ rated: false, message: 'Pending Evaluation' });
        }
    } catch (error) {
        console.error("Error checking rating status:", error);
        res.status(500).json({ message: 'Server error' });
    }
};




const getAssignedPapers = async (req, res) => {
    try {
        // Ensure only evaluators can access this route
        if (req.user.role !== "evaluator") {
            return res.status(403).json({ message: "Access denied. Only evaluators can access this route." });
        }

        const evaluatorId = req.user.uid; // Get the logged-in evaluator's ID

        // Get current time in IST
        const currentTimeIST = moment2().tz("Asia/Kolkata");
        const fiveMinutesAgoIST = moment2(currentTimeIST).subtract(60, "minutes");

        // Fetch assigned research papers where session is active or ended within 5 minutes
        const assignedPapers = await EvaluatorAssignment.findAll({
            where: {
                uid: evaluatorId,
                session_start: { [Op.lte]: currentTimeIST.format("YYYY-MM-DD HH:mm:ss") }, // Convert to string format
                session_end: { [Op.gte]: fiveMinutesAgoIST.format("YYYY-MM-DD HH:mm:ss") } // Convert to string format
            },
            include: [
                {
                    model: ResearchPaper,
                    attributes: ["rid", "title", "author_name", "post_date", "paper_file", "domain"],
                    include: [
                        {
                            model: ResearchPaperRating,
                            attributes: ["q1", "q2", "q3", "q4", "q5", "recommend_best_paper"], // Include the new field
                            where: { uid: evaluatorId },
                            required: false // Include even if no rating exists
                        }
                    ]
                }
            ]
        });

        // Format response
        const response = assignedPapers.map((assignment) => {
            const researchPaper = assignment.ResearchPaper;
            const rating = researchPaper.ResearchPaperRatings.length > 0 ? researchPaper.ResearchPaperRatings[0] : null;

            // Convert session start and end times to readable format
            const sessionStartIST = moment2(assignment.session_start).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
            const sessionEndIST = moment2(assignment.session_end).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

            // Calculate session duration in minutes
            const sessionDuration = moment2(assignment.session_end).diff(moment2(assignment.session_start), "minutes");

            return {
                rid: researchPaper.rid,
                title: researchPaper.title,
                author_name: researchPaper.author_name,
                post_date: moment2(researchPaper.post_date).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
                paper_file: researchPaper.paper_file,
                domain: researchPaper.domain,
                evaluation_pending: !rating,
                score: rating ? [rating.q1, rating.q2, rating.q3, rating.q4, rating.q5] : null,
                total_score: rating ? (rating.q1 + rating.q2 + rating.q3 + rating.q4 + rating.q5) : null, // ✅ Add total score
                recommend_best_paper: rating ? rating.recommend_best_paper : false, // ✅ Add recommend_best_paper field
                session_start: sessionStartIST, // ✅ Add session start time
                session_end: sessionEndIST, // ✅ Add session end time
                session_duration: sessionDuration + " minutes" // ✅ Add session duration
            };
        });

        return res.json(response);
    } catch (error) {
        console.error("Error fetching assigned papers:", error);
        res.status(500).json({ message: "Server error" });
    }
};
















const downloadEvaluatorsExcel = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only admins can download evaluators list.' });
        }

        const evaluators = await User.findAll({
            where: {
                role: 'evaluator',
                approval_status: ['approved']
            },
            attributes: ['uid', 'name', 'email', 'approval_status', 'domain', 'createdAt']
        });

        if (evaluators.length === 0) {
            return res.status(404).json({ message: 'No evaluators found.' });
        }

        const workbook = xlsx.utils.book_new();
        const worksheetData = evaluators.map(evaluator => ({
            UID: evaluator.uid,
            Name: evaluator.name,
            Email: evaluator.email,
            Approval_Status: evaluator.approval_status,
            Domain: evaluator.domain,
            Created_At: moment(evaluator.createdAt).format('YYYY-MM-DD HH:mm:ss')
        }));

        const worksheet = xlsx.utils.json_to_sheet(worksheetData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Evaluators');

        const filePath = path.join(__dirname, '../uploads/reports/evaluators_list.xlsx');
        xlsx.writeFile(workbook, filePath);

        res.download(filePath, 'evaluators_list.xlsx', (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ message: 'Error downloading file' });
            }
            fs.unlinkSync(filePath); // Delete the file after sending
        });
    } catch (error) {
        console.error('Error generating evaluator Excel file:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};









// Get research paper details with evaluator assignment and ratings
const getResearchPaperDetails = async (req, res) => {
    try {
        const researchPapers = await ResearchPaper.findAll({
            attributes: ['rid', 'title', 'author_name', 'post_date', 'paper_file', 'domain'],
            include: [
                {
                    model: EvaluatorAssignment,
                    attributes: ['eaid'],
                    include: [
                        {
                            model: User,
                            attributes: ['uid', 'name', 'email'],
                            where: { role: 'evaluator' },
                            required: false
                        }
                    ]
                },
                {
                    model: ResearchPaperRating,
                    attributes: ['rprid', 'q1', 'q2', 'q3', 'q4', 'q5'],
                    include: [
                        {
                            model: User,
                            attributes: ['uid', 'name', 'email'],
                            where: { role: 'evaluator' },
                            required: false
                        }
                    ]
                }
            ]
        });

        res.status(200).json(researchPapers);
    } catch (error) {
        console.error("Error fetching research paper details:", error);
        res.status(500).json({ message: 'Server error' });
    }
};





// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        // Validate request body
        if (!req.body.email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const { email } = req.body;
        // console.log("Received Email:", email);

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email with the reset token
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL, // Your email
                pass: process.env.EMAIL_PASSWORD, // Your email password
            },
        });

        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`; // Update as needed
        const mailOptions = {
            from:`"PICET" <${process.env.EMAIL}>`,
            to: email,
            subject: "Password Reset Request",
            html: `
                <div style="max-width: 600px; width: 100%; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background: #ffffff;">
                    <!-- Header Section -->
                    <div style="background: #0047ab; padding: 15px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="color: white; margin: 0; font-size: 22px;">Password Reset Request</h2>
                    </div>

                    <!-- Email Body -->
                    <div style="padding: 20px; text-align: left; color: #333;">
                        <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
                        <p style="font-size: 16px; line-height: 1.5;">
                            We received a request to reset your password for your <b>PICET</b> account. No worries, it happens! You can reset your password by clicking the button below:
                        </p>
                        
                        <!-- Reset Button -->
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="${resetUrl}" style="background: #0047ab; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block; width: 80%; max-width: 250px; text-align: center;">
                                Reset Password
                            </a>
                        </div>

                        <p style="font-size: 16px; line-height: 1.5;">
                            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                        <p style="font-size: 16px; line-height: 1.5;">
                            For security reasons, this password reset link will expire in <b>1 hour</b>. If you need further assistance, please contact our support team.
                        </p>

                        <p style="font-size: 16px; line-height: 1.5;">Thank you for using <b>PICET</b>.</p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #555; border-radius: 0 0 10px 10px;">
                        &copy; ${new Date().getFullYear()} PICET | All Rights Reserved
                    </div>
                </div>
            `,
        };
        

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Password reset email sent successfully" });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Server error, please try again later" });
    }
};  


// reset Password for Forgot Password
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Reset token is required" });
        }
        if (!password) {
            return res.status(400).json({ message: "New password is required" });
        }

        // Hash the token before searching in the database
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken, // Compare with hashed token
                resetPasswordExpires: { [Op.gt]: Date.now() }, // Check expiry
            },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Prevent reusing the same password
        const isSamePassword = await bcrypt.compare(password, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password must be different from the old password" });
        }

        // Hash the new password and update user
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = null; // Clear reset token
        user.resetPasswordExpires = null; // Clear expiry
        await user.save();

        res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Internal server error. Please try again later." });
    }
};


// Delete Account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.uid;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.destroy();
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};






const generateReport = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'evaluator') {
            return res.status(403).json({ message: 'Access denied. Evaluators only.' });
        }

        const evaluatorId = req.user.uid;
        const evaluatorName = req.user.name;
        const evaluatorEmail = req.user.email;
        const now = moment2().tz("Asia/Kolkata");

        const researchPapers = await ResearchPaper.findAll({
            attributes: ['rid', 'title', 'author_name', 'post_date', 'domain'],
            include: [
                {
                    model: EvaluatorAssignment,
                    attributes: ['session_start', 'session_end'],
                    where: { uid: evaluatorId },
                    required: true
                },
                {
                    model: ResearchPaperRating,
                    attributes: ['q1', 'q2', 'q3', 'q4', 'q5', 'recommend_best_paper'],
                    where: { uid: evaluatorId },
                    required: false
                }
            ]
        });

        const formatDateOnly = (date) => moment2(date).tz("Asia/Kolkata").format("DD-MM-YYYY");
        const formatTime = (date) => moment2(date).tz("Asia/Kolkata").format("hh:mm A");

        let groupedSessions = {};

        researchPapers.forEach(paper => {
            const sessionStart = moment2(paper.EvaluatorAssignments[0].session_start).tz("Asia/Kolkata");
            const sessionEnd = moment2(paper.EvaluatorAssignments[0].session_end).tz("Asia/Kolkata").add(60, 'minutes');

            if (now.isBetween(sessionStart, sessionEnd)) {
                const sessionSlot = `${formatTime(sessionStart)} - ${formatTime(sessionEnd)}`;
                let recommendation = 'NA';
                let totalScore = 'NA';
                
                if (paper.ResearchPaperRatings.length > 0) {
                    const rating = paper.ResearchPaperRatings[0];
                    totalScore = (rating.q1 || 0) + (rating.q2 || 0) + (rating.q3 || 0) + (rating.q4 || 0) + (rating.q5 || 0);
                    recommendation = rating.recommend_best_paper === true ? 'Yes' : (rating.recommend_best_paper === false ? 'No' : 'NA');
                }

                if (!groupedSessions[sessionSlot]) {
                    groupedSessions[sessionSlot] = [];
                }

                groupedSessions[sessionSlot].push({
                    rid: paper.rid,
                    title: paper.title,
                    author: paper.author_name,
                    domain: paper.domain,
                    post_date: formatDateOnly(paper.post_date),
                    totalScore,
                    recommendation
                });
            }
        });

        if (Object.keys(groupedSessions).length === 0) {
            return res.status(400).json({ message: "No active session found to generate report." });
        }

        const leftLogoUrl = 'http://localhost:5000/assets/logo_picet.png';
        const rightLogoUrl = 'http://localhost:5000/assets/logo_parul.png';

        let htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Session-wise Research Paper Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #0047ab; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                .logo-container { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; position: relative; }
                .logo { width: 150px; height: auto; }
                .title { flex-grow: 1; text-align: center; font-size: 24px; margin: 0; }
                .right-logo { position: absolute; right: 0; top: 0;width: 180px; height: auto; }
                .signature-container { margin-top: 50px; text-align: right; font-size: 16px; font-weight: bold; }
                .signature-line { border-top: 1px solid black; width: 200px; margin-top: 5px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="logo-container">
                <img src="${leftLogoUrl}" alt="Left Logo" class="logo">
                <h2 class="title">Research Paper Evaluation Report</h2>
                <img src="${rightLogoUrl}" alt="Right Logo" class="logo right-logo">
            </div>
            <p>Generated On: ${formatDateOnly(new Date())}</p>
            <p>Name: ${evaluatorName}</p>
            <p>Email: ${evaluatorEmail}</p>`;

        Object.keys(groupedSessions).forEach(session => {
            htmlContent += `
            <h3>Session: ${session}</h3>
            <table>
                <tr>
                    <th>Paper ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Domain</th>
                    <th>Posted Date</th>
                    <th>Total Score</th>
                    <th>Recommend Best Paper</th>
                </tr>`;
            groupedSessions[session].forEach(paper => {
                htmlContent += `
                <tr>
                    <td>${paper.rid}</td>
                    <td>${paper.title}</td>
                    <td>${paper.author}</td>
                    <td>${paper.domain}</td>
                    <td>${paper.post_date}</td>
                    <td>${paper.totalScore}</td>
                    <td>${paper.recommendation}</td>
                </tr>`;
            });
            htmlContent += `</table>`;
        });

        htmlContent += `
            <div class="signature-container">
                <span class="signature-line"></span><br>
                Signature
            </div>
        </body>
        </html>`;

        const timestamp = Date.now();
        const pdfFilePath = path.join(__dirname, `../uploads/reports/session_report_${timestamp}.pdf`);

        pdf.create(htmlContent).toFile(pdfFilePath, (err, resFile) => {
            if (err) return res.status(500).json({ message: 'Error generating report' });
            res.download(pdfFilePath, `session_report_${timestamp}.pdf`, () => fs.unlink(pdfFilePath, () => {}));
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};











const downloadExcelReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Fetch research papers with evaluator assignments and ratings
        const researchPapers = await ResearchPaper.findAll({
            attributes: [
                'rid', 'title', 'author_name', 'post_date', 'paper_file', 'domain'
            ],
            include: [
                {
                    model: EvaluatorAssignment,
                    attributes: ['session_start', 'session_end', 'uid'],
                    include: [{
                        model: User,
                        attributes: ['name', 'email'],
                        where: { role: 'evaluator' },
                        required: false
                    }],
                    required: false  // Allow research papers without evaluators
                },
                {
                    model: ResearchPaperRating,
                    attributes: ['uid', 'q1', 'q2', 'q3', 'q4', 'q5', 'recommend_best_paper'],
                    required: false  // Allow research papers without ratings
                }
            ],
            order: [['rid', 'ASC']],
            subQuery: false
        });

        // Process data for Excel
        let reportData = [];
        
        researchPapers.forEach(paper => {
            // If no evaluators are assigned, add a "No Evaluator Assigned" row
            if (paper.EvaluatorAssignments.length === 0) {
                reportData.push({
                    'Paper ID': paper.rid,
                    'Title': paper.title,
                    'Author': paper.author_name,
                    'Domain': paper.domain,
                    'Post Date': paper.post_date,
                    'Evaluator Name': 'No Evaluator Assigned',
                    'Evaluator Email': 'N/A',
                    'Session Start': 'N/A',
                    'Session End': 'N/A',
                    'Effectiveness in conveying research': 'NA',
                    'Originality and significance of research': 'NA',
                    'Presentation structure and clarity': 'NA',
                    'Communication and visual aids': 'NA',
                    'Organization and time management': 'NA',
                    'Total Rating': 'NA',
                    'Recommended as Best Paper': 'NA'
                });
            }

            // Process each evaluator and their rating
            paper.EvaluatorAssignments.forEach(assignment => {
                let evaluator = assignment.User ? {
                    id: assignment.uid,
                    name: assignment.User.name,
                    email: assignment.User.email,
                    sessionStart: assignment.session_start || 'N/A',
                    sessionEnd: assignment.session_end || 'N/A',
                } : {
                    id: null,
                    name: 'Not Assigned',
                    email: 'Not Assigned',
                    sessionStart: 'N/A',
                    sessionEnd: 'N/A',
                };

                // Find the corresponding rating for this evaluator
                const rating = paper.ResearchPaperRatings.find(r => r.uid === evaluator.id);

                // Debugging: Check if ratings exist
                console.log(`Paper ID: ${paper.rid}, Evaluator: ${evaluator.name}, Rating: ${rating ? JSON.stringify(rating) : 'No Rating Found'}`);

                // Get individual ratings or 'NA'
                const effectiveness = rating ? rating.q1 : 'NA';
                const originality = rating ? rating.q2 : 'NA';
                const structure = rating ? rating.q3 : 'NA';
                const communication = rating ? rating.q4 : 'NA';
                const organization = rating ? rating.q5 : 'NA';

                // Calculate total score or 'NA'
                const totalScore = rating ? (rating.q1 + rating.q2 + rating.q3 + rating.q4 + rating.q5) : 'NA';

                // Determine recommendation status
                let recommendBestPaper = 'NA';
                if (rating && rating.q1 !== null && rating.q2 !== null && rating.q3 !== null &&
                    rating.q4 !== null && rating.q5 !== null) {
                    recommendBestPaper = rating.recommend_best_paper ? 'Yes' : 'No';
                }

                // Push data to report
                reportData.push({
                    'Paper ID': paper.rid,
                    'Title': paper.title,
                    'Author': paper.author_name,
                    'Domain': paper.domain,
                    'Post Date': paper.post_date,
                    'Evaluator Name': evaluator.name,
                    'Evaluator Email': evaluator.email,
                    'Session Start': evaluator.sessionStart,
                    'Session End': evaluator.sessionEnd,
                    'Effectiveness in conveying research': effectiveness,
                    'Originality and significance of research': originality,
                    'Presentation structure and clarity': structure,
                    'Communication and visual aids': communication,
                    'Organization and time management': organization,
                    'Total Rating': totalScore,
                    'Recommended as Best Paper': recommendBestPaper
                });
            });
        });

        // Create Excel file
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(reportData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Research Papers Report');

        const filePath = path.join(__dirname, '../uploads/reports', 'ResearchPapersReport.xlsx');
        xlsx.writeFile(workbook, filePath);

        res.download(filePath, 'ResearchPapersReport.xlsx', err => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ message: 'Error downloading file' });
            }
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};














// Logout
const logout = async (req, res) => {
    try {
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, uploadEvaluators, login, logout, uploadResearchPaper, assignEvaluator, deleteResearchPaper, getResearchPapers , getResearchPaperFile,approveEvaluator, rejectEvaluator, getEvaluators, rateResearchPaper ,checkIfRated, getResearchPaperDetails,forgotPassword, resetPassword, deleteAccount, getAssignedPapers, editResearchPaperRating, generateReport, downloadExcelReport, downloadEvaluatorsExcel };