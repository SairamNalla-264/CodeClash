const mongoose = require('mongoose');
require('dotenv').config();
const Problem = require('../../models/Problem');

/**
 * Maintenance script to rename the primary function to "solve" 
 * in both starterCode and driverCode for all languages.
 */
const unifyToSolve = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const problems = await Problem.find();
        console.log(`Found ${problems.length} problems to process.`);

        for (const problem of problems) {
            let updated = false;

            // --- JAVASCRIPT ---
            let jsStarter = problem.starterCode.get('javascript');
            let jsDriver = problem.driverCode.get('javascript');

            if (jsStarter && jsDriver) {
                const jsNameMatch = jsStarter.match(/(?:function|var|let|const)\s+([a-zA-Z0-9_]+)/);
                if (jsNameMatch) {
                    const currentName = jsNameMatch[1];
                    if (currentName !== 'solve') {
                        console.log(`[JS] Renaming ${currentName} -> solve in ${problem.title}`);
                        jsStarter = jsStarter.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.starterCode.set('javascript', jsStarter);
                        jsDriver = jsDriver.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.driverCode.set('javascript', jsDriver);
                        updated = true;
                    }
                }
            }

            // --- PYTHON ---
            let pyStarter = problem.starterCode.get('python');
            let pyDriver = problem.driverCode.get('python');

            if (pyStarter && pyDriver) {
                const pyNameMatch = pyStarter.match(/def\s+([a-zA-Z0-9_]+)/);
                if (pyNameMatch) {
                    const currentName = pyNameMatch[1];
                    if (currentName !== 'solve') {
                        console.log(`[PY] Renaming ${currentName} -> solve in ${problem.title}`);
                        pyStarter = pyStarter.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.starterCode.set('python', pyStarter);
                        pyDriver = pyDriver.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.driverCode.set('python', pyDriver);
                        updated = true;
                    }
                }
            }

            // --- JAVA ---
            let javaStarter = problem.starterCode.get('java');
            let javaDriver = problem.driverCode.get('java');

            if (javaStarter && javaDriver) {
                const javaNameMatch = javaStarter.match(/(?:public|private|protected|static|\s) +[\w<>[\]]+ +(\w+) *\(/);
                if (javaNameMatch) {
                    const currentName = javaNameMatch[1];
                    if (currentName !== 'solve' && currentName !== 'main') {
                        console.log(`[JAVA] Renaming ${currentName} -> solve in ${problem.title}`);
                        javaStarter = javaStarter.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.starterCode.set('java', javaStarter);
                        javaDriver = javaDriver.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.driverCode.set('java', javaDriver);
                        updated = true;
                    }
                }
            }

            // --- CPP ---
            let cppStarter = problem.starterCode.get('cpp');
            let cppDriver = problem.driverCode.get('cpp');

            if (cppStarter && cppDriver) {
                const cppNameMatch = cppStarter.match(/(?:[\w<>[\]:]+) +(\w+) *\(/);
                if (cppNameMatch) {
                    const currentName = cppNameMatch[1];
                    if (currentName !== 'solve' && currentName !== 'main') {
                        console.log(`[CPP] Renaming ${currentName} -> solve in ${problem.title}`);
                        cppStarter = cppStarter.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.starterCode.set('cpp', cppStarter);
                        cppDriver = cppDriver.replace(new RegExp(`\\b${currentName}\\b`, 'g'), 'solve');
                        problem.driverCode.set('cpp', cppDriver);
                        updated = true;
                    }
                }
            }

            if (updated) {
                await problem.save();
                console.log(` - Saved changes for ${problem.title}`);
            }
        }

        console.log('Unification complete.');
        process.exit(0);
    } catch (err) {
        console.error('Unification failed:', err);
        process.exit(1);
    }
};

unifyToSolve();
