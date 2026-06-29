import { string } from "zod";

export {};

const nums = [1, 2, "kenenisa", 'join', 3, 5];

for (const n in nums) {
    if( typeof n === 'string') {
        console.log(n)
    }
}