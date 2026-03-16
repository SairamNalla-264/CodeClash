const joinCodeWithDriver = (code, driver, language) => {
    if (!driver) return code;

    if (language === 'java' || language === 'cpp') {
        const lines = (code + '\n' + driver).split('\n');
        const imports = [];
        const body = [];

        const importRegex = language === 'java' ? /^import\s+/ : /^#include\s+/;

        lines.forEach(line => {
            if (importRegex.test(line.trim())) {
                imports.push(line);
            } else {
                body.push(line);
            }
        });

        return [...new Set(imports)].join('\n') + '\n\n' + body.join('\n');
    }

    // Default for other languages
    return code + '\n' + driver;
}

const javaCode = `class Solution {
    public int[] solve(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        return new int[]{0, 1};
    }
}`;

const javaDriver = `import java.util.*;
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}`;

console.log("--- JAVA TEST ---");
const resultJava = joinCodeWithDriver(javaCode, javaDriver, 'java');
console.log(resultJava);

const cppCode = `class Solution {
public:
    vector<int> solve(vector<int>& nums, int target) {
        return {0, 1};
    }
};`;

const cppDriver = `#include <iostream>
#include <vector>
int main() {
    return 0;
}`;

console.log("\n--- CPP TEST ---");
const resultCpp = joinCodeWithDriver(cppCode, cppDriver, 'cpp');
console.log(resultCpp);
