Component({
  data: {
    province: '',
    retireDate: '',
    retireAge: '',
    monthlyPension: ''
  },
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this);
      modelCtx.on('result', (data) => {
        const sc = data && data.result && data.result.structuredContent;
        if (sc) {
          this.setData({
            province: sc.province || '',
            retireDate: sc.retireDate || '',
            retireAge: sc.retireAge || '',
            monthlyPension: sc.monthlyPension != null ? sc.monthlyPension : ''
          });
        }
      });
    }
  }
});
