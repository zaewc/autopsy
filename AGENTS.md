# autopsy conventions

Use Feature-Sliced Design. Read `docs/architecture.md` before moving boundaries.

- Root `app/` files contain one explicit re-export. Next.js route names are the only naming exception.
- Layer order: `_app` → `_pages` → `widgets` → `features` → `entities` → `shared`. Import only downwards; no sibling-slice imports.
- Outside a slice, use its explicit `index.ts` public API. Inside it, use relative imports. No wildcard re-exports or own-barrel imports.
- `_app` and `shared` have purpose-based segments, not business slices. Shared modules expose individual public APIs.
- Keep single-page UI and state in its page slice. Extract features/widgets for actual reuse, not file size. Do not create empty layers.
- Directories: kebab-case. Components: PascalCase.tsx. Other TypeScript modules: camelCase.ts.
- Keep demo data explicitly marked. Never present sample observations as a real scan or private infrastructure as observed fact.
- Before each PR: run relevant tests, `npm run check`, and a production build. Split changes into coherent PRs, record self-review honestly, and merge only verified heads under the user's authorization.

## UI 안티패턴: AI slop 방지

autopsy는 개발자가 웹사이트의 기술적 근거를 조사하는 도구다. 화면 요소는 탐색, 비교, 상태 이해, 증거 확인 중 어떤 일을 돕는지 설명할 수 있어야 한다. 아래는 참고 글의 사례를 autopsy에 맞게 재구성한 구현·리뷰 기준이다. 서체나 효과의 이름만으로 품질을 판정하지 말고, 사용 목적과 실제 결과를 확인한다.

### 금지할 패턴과 대안

| 안티패턴                        | autopsy에서의 판정·대안                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 그라데이션·네온·글로우 남용     | 헤더·버튼·배경을 동시에 강조하지 않는다. 절제된 중성 배경과 하나의 주된 행동으로 위계를 만든다.                            |
| 의미 없는 다색 팔레트           | 심각도·리소스 종류·관측 상태에 일관된 색 의미를 부여한다. 범례와 텍스트를 함께 제공한다.                                   |
| 획일적인 글래스모피즘·유행 복제 | 흐림·투명도·과장된 테두리를 기본 장식으로 깔지 않는다. 데이터 판독과 겹친 화면 구분에 필요한지 먼저 검토한다.              |
| 반복되는 둥근 카드와 카드 중첩  | 독립된 정보 묶음에만 컨테이너를 쓴다. 연속 데이터는 표·행·구분선으로 표현하고 불필요한 테두리를 제거한다.                  |
| 근거 없는 상태 배지             | `live`, `verified`, `active`는 구별 가능한 실제 상태와 근거가 있을 때만 사용한다. 장식용 점멸을 금지한다.                  |
| 이모지·아이콘·기술 장식 남발    | 제목마다 아이콘 상자를 붙이지 않는다. 장식용 `//`, 가짜 로그·리포트 번호·터미널 문구를 만들지 않는다.                      |
| 관성적인 서체 선택              | Inter·Roboto·Arial·모노스페이스를 습관적으로 지정하지 않는다. 일반 설명과 URL·코드·수치의 역할을 나누고 가독성을 확인한다. |
| 저대비·지나치게 작은 글자       | 정보 밀도를 위해 본문·조작 라벨을 읽기 어렵게 축소하지 않는다. 배경별 대비, 확대 시 읽기, 숫자 구분을 확인한다.            |
| 어긋난 정렬과 임의의 간격       | 아이콘 기준선·수치 열·단위·버튼 높이를 맞춘다. 공통 간격 토큰을 사용하고 긴 URL·줄바꿈에서도 검증한다.                     |
| 결과 화면의 홍보 페이지화       | 과장된 환영 문구와 거대한 슬로건을 반복하지 않는다. 결과 화면은 대상 URL, 관측값, 문제와 다음 행동을 우선한다.             |
| 개발 대화가 새어 나온 문구      | 구현 도구·FSD·프레임워크 선택·프롬프트 요구사항을 제품 카피에 옮기지 않는다. 사용자가 판단에 필요한 정보만 쓴다.           |
| 장식용 모션과 무의미한 대기     | 바운스·탄성·상시 점멸·과장된 hover 이동을 피한다. 상태 전환에 짧은 모션을 쓰고 reduced motion을 지원한다.                  |
| 모바일에서 무조건 세로로 쌓기   | 중요도에 따라 재배치하고, 표·워터폴은 라벨이 유지되는 탐색 방식을 제공한다. 터치 영역과 키보드 조작을 보존한다.            |
| 다음 행동이 없는 상태 화면      | 무한 스피너, 막힌 빈 화면, 이유 없는 오류를 만들지 않는다. 진행 단계·실패 원인·취소·재시도 등 가능한 행동을 보여준다.      |

### autopsy의 데이터 표현 기준

- 모든 차트에는 해석 가능한 지표·단위·축 또는 범례가 있어야 한다. 막대 위치와 표시 수치는 같은 데이터에서 계산한다. 임의의 스파크라인과 근거 없는 거대 점수를 장식으로 추가하지 않는다.
- 관측 사실, 추론, 미확인 정보를 명시적으로 구분한다. 공개 응답으로 확인할 수 없는 데이터베이스나 내부 서버를 확정적으로 그리지 않는다.
- 진단 결과는 근거와 개선 행동으로 이어져야 한다. 심각도는 색만으로 전달하지 않는다.
- 샘플 데이터 안내와 분석 한계는 판단에 필요한 정보이므로 유지한다. 데모를 실제 분석으로 보이게 하는 성공 배지·진행률·시각·신뢰도를 금지한다.
- URL 입력 화면은 입력과 시작 행동에 집중한다. 결과 화면은 조사 작업에 집중한다. 원래 제품 브리프의 데스크톱 우선 방향을 유지하면서 작은 화면에서도 핵심 작업을 보장한다.

### UI 변경 PR의 리뷰 기준

1. 추가한 장식·배지·문구가 어떤 사용자 판단이나 행동을 돕는지 확인한다. 설명할 수 없는 요소는 제거한다.
2. 실제 렌더링을 데스크톱·모바일에서 확인한다. 긴 URL, 빈 결과, 오류, 펼친 근거, 로딩 상태 중 변경에 해당하는 사례를 점검한다.
3. 키보드 포커스, 접근 가능한 이름, 대비, 터치 영역, 가로 넘침, 모션 감소 설정을 확인한다. 자동 테스트만으로 시각 품질이 검증됐다고 말하지 않는다.
4. PR에는 확인한 화면·상태와 남은 한계를 기록한다. 기존 화면도 같은 기준으로 검토하며, 이미 존재한다는 이유로 안티패턴을 재사용하지 않는다.

### 참고 자료

- [AI가 만든 UI를 피하는 디자인 원칙과 안티패턴 정리](https://hgko-dev.tistory.com/555)
- [GeekNews: 슬롭 UI를 알아보는 10가지 단서](https://news.hada.io/topic?id=34370)
- [원문: 10 tells of a slop ui](https://hereticpleb.vercel.app/blog/10-tells-of-slop)
- [Impeccable: 디자인 가이드와 안티패턴](https://github.com/pbakaus/impeccable#anti-patterns)

위 링크는 설계 근거다. 외부 스킬 설치나 실행을 지시하는 것은 아니며, 글의 주관적인 사례 평가는 프로젝트의 검증 결과와 구분한다.
