require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const User = require("../src/models/User");

const makeAdmin = async () => {
    const args = process.argv.slice(2);
    const username = args[0]?.trim();

    if (args.length !== 1 || !username) {
        console.error("Usage: npm run make-admin -- username");
        process.exitCode = 1;
        return;
    }

    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is required");
        process.exitCode = 1;
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);

        const users = await User.find({ name: username });

        if (users.length === 0) {
            console.error(`User not found: ${username}`);
            process.exitCode = 1;
            return;
        }

        if (users.length > 1) {
            console.error(
                `Multiple users found with username "${username}". Refusing to promote an ambiguous user.`
            );
            process.exitCode = 1;
            return;
        }

        const user = users[0];

        if (user.role === "admin") {
            console.log(`${username} is already an admin`);
            return;
        }

        user.role = "admin";
        await user.save();

        console.log(`${username} is now an admin`);
    } catch (error) {
        console.error(`Failed to make admin: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

makeAdmin();
