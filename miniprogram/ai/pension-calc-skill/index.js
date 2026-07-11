// SKILL 入口：注册原子接口
const calculatePension = require('./apis/calculatePension');

const skill = wx.modelContext.createSkill('ai/pension-calc-skill');
skill.registerAPI('calculatePension', calculatePension);

module.exports = skill;
