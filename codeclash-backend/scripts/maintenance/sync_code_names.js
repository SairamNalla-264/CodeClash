const mongoose = require('mongoose');
require('dotenv').config();
const Problem = require('../../models/Problem');

/**
 * Maintenance script to synchronize starterCode and driverCode naming.
 * Most driverCode expects a "solve" function, but starterCode uses 
 * problem-specific names (e.g. twoSum).
 */
const syncCodeNames = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const problems = await Problem.find();
        console.log(`Found ${problems.length} problems to check.`);

        for (const problem of problems) {
            let updated = false;

            // --- JAVASCRIPT ---
            const jsStarter = problem.starterCode.get('javascript');
            const jsDriver = problem.driverCode.get('javascript');

            if (jsStarter && jsDriver) {
                // If driver calls 'solve' and starter DOES NOT have 'solve'
                if (jsDriver.includes('solve(') && !jsStarter.includes('function solve(') && !jsStarter.includes('const solve =')) {
                    console.log(`[JS] Syncing ${problem.title}...`);

                    // Replace the specific function name with 'solve'
                    // We look for common patterns like "var twoSum = function" or "function twoSum"
                    // A simple regex approach to find the first function name after 'var/let/const' or 'function'
                    const jsNameMatch = jsStarter.match(/(?:function|var|let|const)\s+([a-zA-Z0-9_]+)/);
                    if (jsNameMatch && jsNameMatch[1] !== 'solve') {
                        const oldName = jsNameMatch[1];
                        problem.starterCode.set('javascript', jsStarter.replace(new RegExp(oldName, 'g'), 'solve'));
                        updated = true;
                    }
                }
            }

            // --- PYTHON ---
            const pyStarter = problem.starterCode.get('python');
            const pyDriver = problem.driverCode.get('python');

            if (pyStarter && pyDriver) {
                // If driver calls 'sol.solve' or similar and starter lacks it
                if (pyDriver.includes('.solve(') && !pyStarter.includes('def solve(')) {
                    console.log(`[PY] Syncing ${problem.title}...`);
                    const pyNameMatch = pyStarter.match(/def\s+([a-zA-Z0-9_]+)/);
                    if (pyNameMatch && pyNameMatch[1] !== 'solve') {
                        const oldName = pyNameMatch[1];
                        problem.starterCode.set('python', pyStarter.replace(new RegExp(oldName, 'g'), 'solve'));
                        updated = true;
                    }
                }
            }

            if (updated) {
                await problem.save();
                console.log(` - Updated ${problem.title}`);
            }
        }

        console.log('Maintenance complete.');
        process.exit(0);
    } catch (err) {
        console.error('Maintenance failed:', err);
        process.exit(1);
    }
};

syncCodeNames();
