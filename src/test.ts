import {generateId} from './snowFlake'

// 测试
(() => {
  for(let i = 0; i < 100; i ++) {
    console.log(`${i}=${generateId()}`)
  }
})()