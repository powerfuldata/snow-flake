import os, { NetworkInterfaceInfo } from 'os'
import { TextEncoder } from 'text-encoding'
import bigInt from 'big-integer'

const START_TIME: number = 1420041600000; // 开始时间,定义为2015-01-01 00:00:00
const SEQ_LEN: number = 12; // 毫秒内序列所占长度
const TIME_LEN: number = 41; // 时间部分所占长度
const TIME_LEFT_BIT: number = 64 - 1 - TIME_LEN; // 时间部分向左移动的位数 22
const WORK_LEN: number = 5 // 机器id所占长度
const DATA_LEN: number = 5; // 数据中心id所占长度
const DATA_MAX_NUM: number = ~(-1 << DATA_LEN); // 数据中心id最大值 31
const DATA_LEFT_BIT: number = TIME_LEFT_BIT - DATA_LEN; // 数据中心id左移位数 17
const WORK_LEFT_BIT: number = DATA_LEFT_BIT - WORK_LEN; // 机器id左移位数 12
const WORK_MAX_NUM: number = ~(-1 << WORK_LEN);

let LAST_TIME_STAMP: number = -1; //上次生成ID的时间截
let LAST_SEQ: number = 0; // 上一次的毫秒内序列值
let SEQ_MAX_NUM: number = ~(-1 << SEQ_LEN); // 毫秒内序列的最大值 4095
// 获取下一不同毫秒的时间戳，不能与最后的时间戳一样
const nextMillisecond = (lastMillis: number): number => {
  let now = Date.now();
  while (now <= lastMillis) {
    now = Date.now();
  }
  return now;
}
// 获取字符串str的字节数组，然后将数组的元素相加，对（max+1）取余
const getHostId = (str: string, max: number): number => {
  const bytes: Uint8Array = new TextEncoder().encode(str);
  const sum = bytes.reduce((sum: number, item: number): number => {
    sum = sum + item
    return sum
  }, 0)
  return sum % (max + 1);
}

// 获取本机的ipv4地址
const getIpAddress = (): string => {
  const obj = os.networkInterfaces()
  let address: string = ''
  Object.keys(obj).find(o => obj[o]?.find((info: NetworkInterfaceInfo) => {
    const isIp = info.family === 'IPv4'
    isIp && (address = info.address || '');
    return isIp
  }))
  return address;
}
const getDataId = (): number => {
  return getHostId(os.hostname(), DATA_MAX_NUM);
}

const getWorkId = (): number => {
  return getHostId(getIpAddress(), WORK_MAX_NUM);
}
const DATA_ID = getDataId()
const WORK_ID = getWorkId()

// 雪花算法生成分布式id
export const generateId = (): string => {
  let now = Date.now();
  //如果当前时间小于上一次ID生成的时间戳，说明系统时钟回退过,这个时候应当抛出异常
  if (now < LAST_TIME_STAMP) {
    throw new Error(`系统时间错误！ ${START_TIME - now} 毫秒内拒绝生成分布式ID！`)
  }
  if (now === LAST_TIME_STAMP) {
    LAST_SEQ = (LAST_SEQ + 1) & SEQ_MAX_NUM;
    if (LAST_SEQ === 0) {
      now = nextMillisecond(LAST_TIME_STAMP);
    }
  } else {
    LAST_SEQ = 0;
  }
  //上次生成ID的时间截
  LAST_TIME_STAMP = now;
  const first = bigInt(now - START_TIME).shiftLeft(TIME_LEFT_BIT); //((now - START_TIME) << TIME_LEFT_BIT)
  const second = bigInt(DATA_ID).shiftLeft(DATA_LEFT_BIT); //(DATA_ID << DATA_LEFT_BIT)
  const third = bigInt(WORK_ID).shiftLeft(WORK_LEFT_BIT).or(LAST_SEQ);// (WORK_ID << WORK_LEFT_BIT) | LAST_SEQ
  return first.or(second).or(third).toString(); // first | second | third
}

