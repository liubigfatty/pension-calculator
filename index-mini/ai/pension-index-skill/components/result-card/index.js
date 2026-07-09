Component({
  data: {
    province: '',
    avgIndex: '',
    accountBalance: '',
    totalYears: ''
  },
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this);
      modelCtx.on('result', (data) => {
        const sc = data && data.result && data.result.structuredContent;
        if (sc) {
          this.setData({
            province: sc.province || '',
            avgIndex: sc.avgIndex != null ? sc.avgIndex : '',
            accountBalance: sc.accountBalance != null ? sc.accountBalance : '',
            totalYears: sc.totalYears != null ? sc.totalYears : ''
          });
        }
      });
    }
  }
});
