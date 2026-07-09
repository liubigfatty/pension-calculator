// SKILL 入口：注册原子接口
const calculatePensionIndex = require('./apis/calculatePensionIndex');
const reverseIndexByBalance = require('./apis/reverseIndexByBalance');
const reverseYearlyByCurrentBase = require('./apis/reverseYearlyByCurrentBase');
const reverseYearlyByTargetIndex = require('./apis/reverseYearlyByTargetIndex');

const skill = wx.modelContext.createSkill('ai/pension-index-skill');
skill.registerAPI('calculatePensionIndex', calculatePensionIndex);
skill.registerAPI('reverseIndexByBalance', reverseIndexByBalance);
skill.registerAPI('reverseYearlyByCurrentBase', reverseYearlyByCurrentBase);
skill.registerAPI('reverseYearlyByTargetIndex', reverseYearlyByTargetIndex);

module.exports = skill;
