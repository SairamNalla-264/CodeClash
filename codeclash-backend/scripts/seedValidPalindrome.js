const mongoose = require('mongoose')
const Problem = require('../models/Problem')
const User = require('../models/User')
require('dotenv').config()

const validPalindromeData = {
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    topics: ['Two Pointers', 'String'],
    companies: ['Amazon', 'Facebook', 'Microsoft'],
    description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

**Example 1:**
Input: s = "A man, a plan, a canal: Panama"
Output: true
Explanation: "amanaplanacanalpanama" is a palindrome.

**Example 2:**
Input: s = "race a car"
Output: false
Explanation: "raceacar" is not a palindrome.

**Example 3:**
Input: s = " "
Output: true
Explanation: s is an empty string "" after removing non-alphanumeric characters.
Since an empty string reads the same forward and backward, it is a palindrome.

**Constraints:**
- \`1 <= s.length <= 2 * 10^5\`
- \`s\` consists only of printable ASCII characters.`,
    examples: [
        {
            input: 's = "A man, a plan, a canal: Panama"',
            output: 'true',
            explanation: '"amanaplanacanalpanama" is a palindrome.'
        },
        {
            input: 's = "race a car"',
            output: 'false',
            explanation: '"raceacar" is not a palindrome.'
        },
        {
            input: 's = " "',
            output: 'true',
            explanation: 's is an empty string after removing non-alphanumeric characters.'
        }
    ],
    constraints: [
        '1 <= s.length <= 2 * 10^5',
        's consists only of printable ASCII characters.'
    ],
    visibleTestCases: [
        { input: '"A man, a plan, a canal: Panama"', output: 'true' },
        { input: '"race a car"', output: 'false' },
        { input: '" "', output: 'true' }
    ],
    hiddenTestCases: [
        { input: '"A man, a plan, a canal: Panama"', output: 'true' },
        { input: '"race a car"', output: 'false' },
        { input: '" "', output: 'true' },
        { input: '"ab_a"', output: 'true' },
        { input: '"0P"', output: 'false' },
        { input: '"a."', output: 'true' },
        { input: '"Was it a car or a cat I saw?"', output: 'true' },
        { input: '"tab a cat"', output: 'false' }
    ],
    starterCode: {
        javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
var solve = function(s) {
    
};`,
        python: `class Solution:
    def solve(self, s: str) -> bool:
        `,
        cpp: `class Solution {
public:
    bool solve(string s) {
        
    }
};`,
        java: `class Solution {
    public boolean solve(String s) {
        
    }
}`
    },
    driverCode: {
        javascript: `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input === '') {
    console.log("true");
    process.exit(0);
}
// Strip the surrounding quotes used in test inputs
const s = input.startsWith('"') && input.endsWith('"') 
    ? input.substring(1, input.length - 1) 
    : input;
const result = solve(s);
console.log(JSON.stringify(result));
`,
        python: `
import json
import sys

def main():
    line = sys.stdin.read().strip()
    if not line:
        print("true")
        return
    # Strip quotes
    s = line[1:-1] if line.startswith('"') and line.endswith('"') else line
    sol = Solution()
    result = sol.solve(s)
    print("true" if result else "false")

if __name__ == "__main__":
    main()
`,
        cpp: `
#include <iostream>
#include <string>

using namespace std;

int main() {
    string line;
    if (!getline(cin, line)) {
        cout << "true" << endl;
        return 0;
    }
    // Strip quotes
    if (line.front() == '"' && line.back() == '"') {
        line = line.substr(1, line.length() - 2);
    }
    Solution sol;
    bool result = sol.solve(line);
    cout << (result ? "true" : "false") << endl;
    return 0;
}
`,
        java: `
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (!sc.hasNextLine()) {
            System.out.println("true");
            return;
        }
        String line = sc.nextLine().trim();
        if (line.startsWith("\\\"") && line.endsWith("\\\"")) {
            line = line.substring(1, line.length() - 1);
        }
        Solution sol = new Solution();
        boolean result = sol.solve(line);
        System.out.println(result ? "true" : "false");
    }
}
`
    }
}

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('Connected to MongoDB')

        const user = await User.findOne({ role: 'admin' }) || await User.findOne()
        if (!user) {
            console.error('No users found. Create a user first.')
            process.exit(1)
        }

        const existing = await Problem.findOne({ title: validPalindromeData.title })
        if (existing) {
            console.log('Problem already exists. Updating...')
            Object.assign(existing, validPalindromeData)
            existing.createdBy = user._id
            await existing.save()
            console.log('Updated Valid Palindrome.')
        } else {
            console.log('Creating Valid Palindrome...')
            const problem = new Problem({
                ...validPalindromeData,
                createdBy: user._id
            })
            await problem.save()
            console.log('Created Valid Palindrome.')
        }

        process.exit(0)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

seed()
