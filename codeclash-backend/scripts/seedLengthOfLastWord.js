const mongoose = require('mongoose')
const Problem = require('../models/Problem')
const User = require('../models/User')
require('dotenv').config()

const lengthLastWordData = {
    title: 'Length of Last Word',
    difficulty: 'Easy',
    topics: ['String'],
    companies: ['Amazon', 'Microsoft', 'Google', 'Apple'],
    description: `Given a string \`s\` consisting of words and spaces, return the length of the last word in the string.

A word is defined as a maximal substring consisting of non-space characters only.

The string may contain leading or trailing spaces.

**Example 1:**
Input: s = "Hello World"
Output: 5
Explanation: The last word is "World" with length 5.

**Example 2:**
Input: s = "   fly me   to   the moon  "
Output: 4
Explanation: The last word is "moon".

**Example 3:**
Input: s = "luffy is still joyboy"
Output: 6
Explanation: The last word is "joyboy".

**Constraints:**
- \`1 <= s.length <= 10^4\`
- \`s consists of only English letters and spaces ' '\`
- There will be at least one word in \`s\``,
    examples: [
        {
            input: 's = "Hello World"',
            output: '5',
            explanation: 'The last word is "World" with length 5'
        },
        {
            input: 's = "   fly me   to   the moon  "',
            output: '4',
            explanation: 'The last word is "moon"'
        },
        {
            input: 's = "luffy is still joyboy"',
            output: '6',
            explanation: 'The last word is "joyboy"'
        }
    ],
    constraints: [
        '1 <= s.length <= 10^4',
        "s consists of only English letters and spaces ' '",
        'There will be at least one word in s'
    ],
    visibleTestCases: [
        { input: '"Hello World"', output: '5' },
        { input: '"   fly me   to   the moon  "', output: '4' },
        { input: '"luffy is still joyboy"', output: '6' }
    ],
    hiddenTestCases: [
        { input: '"Hello World"', output: '5' },
        { input: '"   fly me   to   the moon  "', output: '4' },
        { input: '"luffy is still joyboy"', output: '6' },
        { input: '"single"', output: '6' },
        { input: '"a "', output: '1' },
        { input: '"   hello   "', output: '5' },
        { input: '"leetcode"', output: '8' }
    ],
    starterCode: {
        javascript: `/**
 * @param {string} s
 * @return {number}
 */
var solve = function(s) {

};`,
        python: `class Solution:
    def solve(self, s: str) -> int:
        `,
        cpp: `class Solution {
public:
    int solve(string s) {

    }
};`,
        java: `import java.util.*;
class Solution {
    public int solve(String s) {

    }
}`
    },
    driverCode: {
        javascript: `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (!input) process.exit(0);
const s = input;
const result = solve(s);
console.log(result);
`,
        python: `
import sys

def main():
    s = sys.stdin.read()
    if not s: return
    s = s.strip("\\n")
    sol = Solution()
    result = sol.solve(s)
    print(result)

if __name__ == "__main__":
    main()
`,
        cpp: `
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);

    Solution sol;
    int result = sol.solve(s);
    cout << result << endl;

    return 0;
}
`,
        java: `
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String s = sc.nextLine();

        Solution sol = new Solution();
        int result = sol.solve(s);
        System.out.println(result);
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

        const existing = await Problem.findOne({ title: lengthLastWordData.title })
        if (existing) {
            console.log('Problem already exists. Updating...')
            Object.assign(existing, lengthLastWordData)
            existing.createdBy = user._id
            await existing.save()
            console.log('Updated Length of Last Word problem.')
        } else {
            console.log('Creating Length of Last Word problem...')
            const problem = new Problem({
                ...lengthLastWordData,
                createdBy: user._id
            })
            await problem.save()
            console.log('Created Length of Last Word problem.')
        }

        process.exit(0)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

seed()
