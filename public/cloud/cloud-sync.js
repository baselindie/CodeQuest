/* Same-origin adapter: secrets remain in HttpOnly server cookies. */
export function createCodeQuestCloud() {
  const markerKey='codequest-cloud-user-v2';
  const readSession=()=>{try{const user=JSON.parse(localStorage.getItem(markerKey)||'null');return user?{user}:null}catch{localStorage.removeItem(markerKey);return null}};
  const writeUser=user=>user?localStorage.setItem(markerKey,JSON.stringify({id:user.id,email:user.email})):localStorage.removeItem(markerKey);
  async function request(path,body={}){const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'No se pudo conectar');return data}
  async function captureRedirectSession(){const params=new URLSearchParams(location.hash.replace(/^#/,''));if(params.get('access_token')&&params.get('refresh_token')){const result=await request('/api/auth/adopt',{access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_in:params.get('expires_in')});writeUser(result.user);history.replaceState(null,'','/?view=account');return {user:result.user}}try{const result=await request('/api/auth/session');if(!result.authenticated||!result.user){writeUser(null);return null}writeUser(result.user);return {user:result.user}}catch{writeUser(null);return null}}
  async function signUp(email,password){const result=await request('/api/auth/signup',{email,password});if(result.authenticated)writeUser(result.user);return result}
  async function signIn(email,password){const result=await request('/api/auth/login',{email,password});writeUser(result.user);return {user:result.user}}
  async function requestPasswordReset(email){return request('/api/auth/recover',{email})}
  async function resendConfirmation(email){return request('/api/auth/resend',{email})}
  async function updatePassword(password){return request('/api/auth/password',{password})}
  async function deleteAccount(){await request('/api/auth/delete');writeUser(null)}
  async function refreshSession(){const result=await request('/api/auth/session');if(!result.authenticated||!result.user){writeUser(null);throw new Error('Sesión requerida')}writeUser(result.user);return {user:result.user}}
  async function activeSession(){return refreshSession()}
  async function signOut(){await request('/api/auth/logout').catch(()=>{});writeUser(null)}
  async function saveProgress(progress){await activeSession();const result=await request('/api/progress',{action:'save',progress});return result.client_updated_at}
  async function loadProgress(){await activeSession();return request('/api/progress',{action:'load'})}
  async function reportMission(missionIndex,category,message){await activeSession();return request('/api/report',{mission_index:missionIndex,category,message})}
  async function submitBetaFeedback(feedback_type,message,page){await activeSession();return request('/api/beta-feedback',{feedback_type,message,page})}
  async function betaAdmin(action,payload={}){await activeSession();return request('/api/admin/beta-feedback',{action,...payload})}
  async function completeMission(missionIndex,language,code,explanation){return request('/api/mission-completion',{mission_index:missionIndex,language,code,explanation})}
  async function issueCertificate(displayName){return request('/api/certificate',{action:'issue',display_name:displayName})}
  async function verifyCertificate(code){return request('/api/certificate',{action:'verify',code})}
  return {signUp,signIn,signOut,refreshSession,captureRedirectSession,requestPasswordReset,resendConfirmation,updatePassword,deleteAccount,saveProgress,loadProgress,reportMission,submitBetaFeedback,betaAdmin,completeMission,issueCertificate,verifyCertificate,readSession};
}
