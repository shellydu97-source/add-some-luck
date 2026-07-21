// 第一阶段解读边界：页面只从这个 adapter 读取结构化假解读。
// 后续接入 AI 时替换 adapter，不得让 interpretation 修改 calculation 结果。
export { interpretationMocks, mockReply } from '../mocks/interpretations'
