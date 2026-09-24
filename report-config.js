window.DOKI_REPORT_CONFIG={
  // Supabase Project Settings > API 에서 채웁니다.
  // 이 두 값은 웹 클라이언트용 공개 값입니다. service_role 키는 절대 넣지 마세요.
  supabaseUrl:"",
  supabaseAnonKey:"",

  bucket:"bug-report-files",

  // 공개 신고 폼의 첨부 제한
  maxFiles:5,
  maxFileBytes:10485760,
  maxTotalBytes:26214400
};
