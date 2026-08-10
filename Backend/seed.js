const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

const User = require("./models/user");
const Idea = require("./models/idea");
const Message = require("./models/message");

dotenv.config({
    path: path.join(__dirname, ".env")
});

async function seedDatabase() {

    try {

        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("✅ Connected to database:", mongoose.connection.name);


        // ==========================================
        // CLEAR OLD SEEDED DATA
        // ==========================================

        await Message.deleteMany({});
        await Idea.deleteMany({});
        await User.deleteMany({});

        console.log("🗑️ Existing users, ideas and messages cleared.");


        // ==========================================
        // USERS
        // ==========================================

        const users = await User.insertMany([

            {
                name: "Sarah Jenkins",
                email: "sarah@innovnest.com",
                role: "Founder",
                bio: "Founder & Tech Enthusiast building innovative solutions for students and startups.",
                location: "Bangalore, India",
                profileImage: "",
                skills: [
                    "Entrepreneurship",
                    "Product Design",
                    "JavaScript"
                ],
                followers: 245,
                following: 86,
                connections: 124
            },

            {
                name: "David Chen",
                email: "david@innovnest.com",
                role: "Investor",
                bio: "Early-stage investor interested in technology, SaaS and student startups.",
                location: "Singapore",
                profileImage: "",
                skills: [
                    "Investment",
                    "SaaS",
                    "Business Strategy"
                ],
                followers: 890,
                following: 210,
                connections: 350
            },

            {
                name: "Alex Mercer",
                email: "alex@innovnest.com",
                role: "Founder",
                bio: "Building products that connect people and create meaningful opportunities.",
                location: "Mumbai, India",
                profileImage: "",
                skills: [
                    "React",
                    "Node.js",
                    "MongoDB"
                ],
                followers: 420,
                following: 150,
                connections: 210
            },

            {
                name: "Priya Nair",
                email: "priya@innovnest.com",
                role: "Student",
                bio: "Computer science student passionate about AI, education and social impact.",
                location: "Kochi, India",
                profileImage: "",
                skills: [
                    "Python",
                    "AI",
                    "Machine Learning"
                ],
                followers: 180,
                following: 95,
                connections: 76
            },

            {
                name: "Rahul Menon",
                email: "rahul@innovnest.com",
                role: "Mentor",
                bio: "Startup mentor helping young founders turn ideas into successful products.",
                location: "Chennai, India",
                profileImage: "",
                skills: [
                    "Mentoring",
                    "Marketing",
                    "Business Development"
                ],
                followers: 560,
                following: 130,
                connections: 275
            }

        ]);

        console.log(`✅ Created ${users.length} users.`);


        // ==========================================
        // USER REFERENCES
        // ==========================================

        const sarah = users[0];
        const david = users[1];
        const alex = users[2];
        const priya = users[3];
        const rahul = users[4];


        // ==========================================
        // IDEAS
        // ==========================================

        const ideas = await Idea.insertMany([

            {
                title: "CampusConnect",

                description:
                    "A platform that helps college students discover events, clubs, projects, internships and connect with students who share similar interests.",

                category: "SaaS",

                stage: "Idea Stage",

                visibility: "public",

                status: "active",

                likes: 24,

                createdBy: sarah._id
            },


            {
                title: "EcoTrack",

                description:
                    "A smart sustainability platform that helps students and organizations track their carbon footprint and discover simple ways to reduce environmental impact.",

                category: "SaaS",

                stage: "Pre-Seed",

                visibility: "public",

                status: "active",

                likes: 18,

                createdBy: alex._id
            },


            {
                title: "SkillBridge",

                description:
                    "A peer-to-peer learning platform where students can exchange technical and professional skills through short workshops and mentoring sessions.",

                category: "EdTech",

                stage: "Idea Stage",

                visibility: "public",

                status: "active",

                likes: 31,

                createdBy: priya._id
            },


            {
                title: "HealthMate",

                description:
                    "A simple wellness platform that helps students build healthy habits through personalized reminders, activity tracking and community challenges.",

                category: "HealthTech",

                stage: "Pre-Seed",

                visibility: "public",

                status: "active",

                likes: 15,

                createdBy: rahul._id
            },


            {
                title: "GreenCart",

                description:
                    "An online marketplace connecting customers with local sustainable businesses and environmentally friendly products.",

                category: "E-Commerce",

                stage: "Seed",

                visibility: "public",

                status: "in-development",

                likes: 42,

                createdBy: david._id
            },


            {
                title: "AI StudyBuddy",

                description:
                    "An AI-powered study assistant that helps students organize study schedules, summarize learning material and prepare for examinations.",

                category: "AI",

                stage: "Idea Stage",

                visibility: "public",

                status: "active",

                likes: 37,

                createdBy: priya._id
            }

        ]);

        console.log(`✅ Created ${ideas.length} ideas.`);


        // ==========================================
        // MESSAGES
        // ==========================================

        const messages = await Message.insertMany([

            {
                sender: sarah._id,
                receiver: david._id,
                message:
                    "Hi David! I was taking a look at the revised CampusConnect pitch deck. Would love to hear your thoughts."
            },

            {
                sender: david._id,
                receiver: sarah._id,
                message:
                    "Hi Sarah! I really like the direction. The student networking problem is interesting."
            },

            {
                sender: sarah._id,
                receiver: david._id,
                message:
                    "Thanks! I'm planning to add more information about the business model."
            },

            {
                sender: david._id,
                receiver: sarah._id,
                message:
                    "That would be great. We can discuss potential funding opportunities as well."
            },

            {
                sender: alex._id,
                receiver: sarah._id,
                message:
                    "Hey Sarah, I checked out CampusConnect. The community aspect looks really promising."
            },

            {
                sender: sarah._id,
                receiver: alex._id,
                message:
                    "Thank you! I would love to hear your suggestions."
            },

            {
                sender: priya._id,
                receiver: rahul._id,
                message:
                    "Could you take a look at my AI StudyBuddy idea?"
            },

            {
                sender: rahul._id,
                receiver: priya._id,
                message:
                    "Absolutely. I'll review it and send you some feedback."
            },

            {
                sender: david._id,
                receiver: alex._id,
                message:
                    "Your EcoTrack idea caught my attention. Let's connect."
            },

            {
                sender: alex._id,
                receiver: david._id,
                message:
                    "Sure! I'd be happy to discuss the project."
            }

        ]);

        console.log(`✅ Created ${messages.length} messages.`);


        // ==========================================
        // SUMMARY
        // ==========================================

        console.log("");
        console.log("======================================");
        console.log("🎉 DATABASE SEEDING COMPLETE");
        console.log("======================================");
        console.log(`Users:    ${users.length}`);
        console.log(`Ideas:    ${ideas.length}`);
        console.log(`Messages: ${messages.length}`);
        console.log("Database:", mongoose.connection.name);
        console.log("======================================");


    } catch (error) {

        console.error("❌ Database seeding failed:");
        console.error(error.message);

    } finally {

        await mongoose.connection.close();

        console.log("MongoDB connection closed.");

    }

}

seedDatabase();