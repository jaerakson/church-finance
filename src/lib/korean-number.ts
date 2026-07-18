export function numberToKorean(n: number): string {
  if (n === 0) return '영'
  const units = ['', '만', '억', '조']
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  const smallUnits = ['', '십', '백', '천']
  let result = ''
  let unitIndex = 0
  while (n > 0) {
    const chunk = n % 10000
    if (chunk > 0) {
      let chunkStr = ''
      let c = chunk
      for (let i = 0; i < 4; i++) {
        const d = c % 10
        if (d > 0) {
          chunkStr = (d === 1 && i > 0 ? '' : digits[d]) + smallUnits[i] + chunkStr
        }
        c = Math.floor(c / 10)
      }
      result = chunkStr + units[unitIndex] + result
    }
    n = Math.floor(n / 10000)
    unitIndex++
  }
  return result
}
