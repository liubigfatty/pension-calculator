// SKILL 入口：注册原子接口
const calculatePensionIndex = require('./apis/calculatePensionIndex');

const skill = wx.modelContext.createSkill('ai/pension-index-skill');
skill.registerAPI('calculatePensionIndex', calculatePensionIndex);

module.exports = skill;
