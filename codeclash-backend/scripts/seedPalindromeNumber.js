const mongoose = require('mongoose')
const Problem = require('../models/Problem')
const User = require('../models/User')
require('dotenv').config()

const palindromeData = {
    title: 'Palindrome Number',
    difficulty: 'Easy',
    topics: ['Math'],
    companies: ['Google', 'Facebook', 'Microsoft'],
    description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

**Example 1:**
Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.

**Example 2:**
Input: x = -121
Output: false
Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.

**Example 3:**
Input: x = 10
Output: false
Explanation: Reads 01 from right to left. Therefore it is not a palindrome.

**Constraints:**
- \`-2^31 <= x <= 2^31 - 1\`

**Follow up:** Could you solve it without converting the integer to a string?`,
    examples: [
        {
            input: 'x = 121',
            output: 'true',
            explanation: '121 reads as 121 from left to right and from right to left.'
        },
        {
            input: 'x = -121',
            output: 'false',
            explanation: 'From left to right, it reads -121. From right to left, it becomes 121-.'
        },
        {
            input: 'x = 10',
            output: 'false',
            explanation: 'Reads 01 from right to left.'
        }
    ],
    constraints: [
        '-2^31 <= x <= 2^31 - 1'
    ],
    visibleTestCases: [
        { input: '121', output: 'true' },
        { input: '-121', output: 'false' },
        { input: '10', output: 'false' }
    ],
    hiddenTestCases: [
        { input: '121', output: 'true' },
        { input: '-121', output: 'false' },
        { input: '10', output: 'false' },
        { input: '0', output: 'true' },
        { input: '12321', output: 'true' },
        { input: '123456', output: 'false' },
        { input: '1000021', output: 'false' },
        { input: '1210', output: 'false' },
        { input: '11', output: 'true' }
    ],
    starterCode: {
        javascript: `/**
 * @param {number} x
 * @return {boolean}
 */
var solve = function(x) {
    
};`,
        python: `class Solution:
    def solve(self, x: int) -> bool:
        `,
        cpp: `class Solution {
public:
    bool solve(int x) {
        
    }
};`,
        java: `class Solution {
    public boolean solve(int x) {
        
    }
}`
    },
    driverCode: {
        javascript: `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input === '') process.exit(0);
const x = parseInt(input);
const result = solve(x);
console.log(JSON.stringify(result));
`,
        python: `
import json
import sys

def main():
    line = sys.stdin.read().strip()
    if not line: return
    x = int(line)
    sol = Solution()
    result = sol.solve(x)
    print("true" if result else "false")

if __name__ == "__main__":
    main()
`,
        cpp: `
#include <iostream>
#include <string>

using namespace std;

int main() {
    int x;
    if (!(cin >> x)) return 0;
    Solution sol;
    bool result = sol.solve(x);
    cout << (result ? "true" : "false") << endl;
    return 0;
}
`,
        java: `
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int x = sc.nextInt();
        Solution sol = new Solution();
        boolean result = sol.solve(x);
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

        const existing = await Problem.findOne({ title: palindromeData.title })
        if (existing) {
            console.log('Problem already exists. Updating...')
            Object.assign(existing, palindromeData)
            existing.createdBy = user._id
            await existing.save()
            console.log('Updated Palindrome Number.')
        } else {
            console.log('Creating Palindrome Number...')
            const problem = new Problem({
                ...palindromeData,
                createdBy: user._id
            })
            await problem.save()
            console.log('Created Palindrome Number.')
        }

        process.exit(0)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

seed()
