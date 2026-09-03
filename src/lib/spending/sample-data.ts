function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function buildSampleInput(referenceDate = new Date()): string {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth() + 1;
  const day = (offset: number) => `${m}/${pad(Math.max(1, Math.min(28, offset)))}`;

  const lines = [
    `${day(2)} 스타벅스 강남점 6300`,
    `${day(3)} 카카오T 택시 12400`,
    `${day(4)} 이마트 김포 29900`,
    `${day(5)} 배달의민족 23000`,
    `${day(6)} 29CM 38866 할부3개월`,
    `${day(7)} 넷플릭스 17000`,
    `${day(8)} 무신사 65000`,
    `${day(9)} 하와이 조개 영등포점 119000`,
    `${day(10)} GS25 편의점 4500`,
    `${day(11)} 스타벅스 강남점 5700`,
    `${day(12)} 네이버페이 161200 할부5개월`,
    `${day(13)} 카카오T 택시 9800`,
    `${day(14)} 이마트 와인 71800`,
    `${day(15)} CGV 용산 32000`,
    `${day(16)} 스타벅스 강남점 6300`,
    `${day(17)} 급여 이체 입금 2800000`,
    `${day(18)} 야놀자 숙박예약 142000`,
    `${day(19)} 올리브영 27500`,
    `${day(20)} 카드결제대금 출금 943516`,
    `${day(21)} 카카오페이 34000`,
    `${day(22)} 세븐일레븐 편의점 3200`,
    `${day(23)} 호프집 종로 49500`,
    `${day(24)} 배달의민족 21000`,
    `${day(25)} 스타벅스 강남점 6300`,
  ];

  return `${y}년 ${m}월 예시 데이터\n${lines.join("\n")}`
    .split("\n")
    .filter((line, index) => index > 0)
    .join("\n");
}
