const mongoose = require('mongoose')
const Problem = require('../models/Problem')
const User = require('../models/User')
require('dotenv').config()

const twoSumData = {
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    companies: ['Amazon', 'Google', 'Apple', 'Adobe', 'Microsoft'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
        {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
        },
        {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]',
            explanation: ''
        },
        {
            input: 'nums = [3,3], target = 6',
            output: '[0,1]',
            explanation: ''
        }
    ],
    constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9',
        '-10^9 <= target <= 10^9',
        'Only one valid answer exists.'
    ],
    visibleTestCases: [
        { input: '[2,7,11,15]\n9', output: '[0,1]' },
        { input: '[3,2,4]\n6', output: '[1,2]' },
        { input: '[3,3]\n6', output: '[0,1]' }
    ],
    hiddenTestCases: [
        { input: '[2,7,11,15]\n9', output: '[0,1]' },
        { input: '[3,2,4]\n6', output: '[1,2]' },
        { input: '[3,3]\n6', output: '[0,1]' },
        { input: '[0,4,3,0]\n0', output: '[0,3]' },
        { input: '[-1,-2,-3,-4,-5]\n-8', output: '[2,4]' },
    ],
    starterCode: {
        javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var solve = function(nums, target) {
    
};`,
        python: `class Solution:
    def solve(self, nums: List[int], target: int) -> List[int]:
        `,
        cpp: `class Solution {
public:
    vector<int> solve(vector<int>& nums, int target) {
        
    }
};`,
        java: `class Solution {
    public int[] solve(int[] nums, int target) {
        
    }
}`
    },
    driverCode: {
        javascript: `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length < 2) process.exit(0);
const nums = JSON.parse(input[0]);
const target = JSON.parse(input[1]);
const result = solve(nums, target);
console.log(JSON.stringify(result));
`,
        python: `
import json
import sys

# User code will be prepended here
# We need to handle the Solution class instance
def main():
    input_data = sys.stdin.read().splitlines()
    if len(input_data) < 2: return
    nums = json.loads(input_data[0])
    target = int(input_data[1])
    
    sol = Solution()
    result = sol.solve(nums, target)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
`,
        cpp: `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>

using namespace std;

// Function to parse [1,2,3] into vector<int>
vector<int> parseVector(string s) {
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
    if (!getline(cin, line)) return 0;
    int target = stoi(line);

    Solution sol;
    vector<int> result = sol.solve(nums, target);
    
    cout << "[" << result[0] << "," << result[1] << "]" << endl;
    return 0;
}
`,
        java: `
public class Main {
    public static void main(String[] args) throws Exception {
        java.util.Scanner sc = new java.util.Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String line1 = sc.nextLine().trim();
        line1 = line1.substring(1, line1.length() - 1);
        String[] parts = line1.split(",");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i].trim());
        
        if (!sc.hasNextInt()) return;
        int target = sc.nextInt();

        Solution sol = new Solution();
        int[] result = sol.solve(nums, target);
        System.out.println("[" + result[0] + "," + result[1] + "]");
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

        const existing = await Problem.findOne({ title: twoSumData.title })
        if (existing) {
            console.log('Two Sum already exists. Updating...')
            Object.assign(existing, twoSumData)
            existing.createdBy = user._id
            await existing.save()
            console.log('Updated Two Sum.')
        } else {
            console.log('Creating Two Sum...')
            const problem = new Problem({
                ...twoSumData,
                createdBy: user._id
            })
            await problem.save()
            console.log('Created Two Sum.')
        }

        process.exit(0)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

seed()
