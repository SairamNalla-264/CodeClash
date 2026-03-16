const mongoose = require('mongoose')
const Problem = require('../models/Problem')
const User = require('../models/User')
require('dotenv').config()

const sumArrayData = {
    title: 'Sum of Elements in an Array',
    difficulty: 'Easy',
    topics: ['Array'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    description: `Given an integer array \`nums\`, return the sum of all elements in the array.

You must compute the total by iterating through the array.

**Example 1:**
Input: nums = [1,2,3,4]
Output: 10
Explanation: 1 + 2 + 3 + 4 = 10

**Example 2:**
Input: nums = [5,10,-3]
Output: 12
Explanation: 5 + 10 + (-3) = 12

**Example 3:**
Input: nums = [0,0,0]
Output: 0
Explanation: The sum of all elements is 0.

**Constraints:**
- \`1 <= nums.length <= 10^5\`
- \`-10^9 <= nums[i] <= 10^9\``,

    examples: [
        {
            input: 'nums = [1,2,3,4]',
            output: '10',
            explanation: '1 + 2 + 3 + 4 = 10'
        },
        {
            input: 'nums = [5,10,-3]',
            output: '12',
            explanation: '5 + 10 + (-3) = 12'
        },
        {
            input: 'nums = [0,0,0]',
            output: '0',
            explanation: 'Sum of all elements is 0'
        }
    ],

    constraints: [
        '1 <= nums.length <= 10^5',
        '-10^9 <= nums[i] <= 10^9'
    ],

    visibleTestCases: [
        { input: '[1,2,3,4]', output: '10' },
        { input: '[5,10,-3]', output: '12' },
        { input: '[0,0,0]', output: '0' }
    ],

    hiddenTestCases: [
        { input: '[1,2,3,4]', output: '10' },
        { input: '[5,10,-3]', output: '12' },
        { input: '[0,0,0]', output: '0' },
        { input: '[100]', output: '100' },
        { input: '[-1,-2,-3]', output: '-6' },
        { input: '[1000,2000,3000]', output: '6000' },
        { input: '[10,-10,10,-10]', output: '0' }
    ],

    starterCode: {
        javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
var solve = function(nums) {
    
};`,

        python: `class Solution:
    def solve(self, nums: list[int]) -> int:
        `,

        cpp: `class Solution {
public:
    int solve(vector<int>& nums) {
        
    }
};`,

        java: `import java.util.*;
class Solution {
    public int solve(int[] nums) {
        
    }
}`
    },

    driverCode: {
        javascript: `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (!input) process.exit(0);
const nums = JSON.parse(input);
const result = solve(nums);
console.log(result);
`,

        python: `
import sys
import json

def main():
    input_data = sys.stdin.read().strip()
    if not input_data: return
    nums = json.loads(input_data)
    sol = Solution()
    result = sol.solve(nums)
    print(result)

if __name__ == "__main__":
    main()
`,

        cpp: `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

// Function to parse [1,2,3] into vector<int>
vector<int> parseVector(string s) {
    if (s.length() < 2) return {};
    s = s.substr(1, s.length() - 2);
    stringstream ss(s);
    string item;
    vector<int> res;
    while (getline(ss, item, ',')) {
        res.push_back(stoi(item));
    }
    return res;
}

int main() {
    string line;
    if (!getline(cin, line)) return 0;
    vector<int> nums = parseVector(line);

    Solution sol;
    int result = sol.solve(nums);
    cout << result << endl;

    return 0;
}
`,

        java: `
public class Main {
    public static void main(String[] args) {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String line = sc.nextLine().trim();

        if (line.length() < 2) return;
        line = line.substring(1, line.length() - 1);
        String[] parts = line.split(",");

        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            nums[i] = Integer.parseInt(parts[i].trim());
        }

        Solution sol = new Solution();
        int result = sol.solve(nums);
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

        const existing = await Problem.findOne({ title: sumArrayData.title })
        if (existing) {
            console.log('Problem already exists. Updating...')
            Object.assign(existing, sumArrayData)
            existing.createdBy = user._id
            await existing.save()
            console.log('Updated Sum of Elements problem.')
        } else {
            console.log('Creating Sum of Elements problem...')
            const problem = new Problem({
                ...sumArrayData,
                createdBy: user._id
            })
            await problem.save()
            console.log('Created Sum of Elements problem.')
        }

        process.exit(0)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

seed()
