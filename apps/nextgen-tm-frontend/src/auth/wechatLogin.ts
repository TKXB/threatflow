// Lightweight WeChat QR login helper per official docs
// https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html

type WeChatLoginOptions = {
  appId: string;
  redirectUri: string;
  state?: string;
  style?: 'black' | 'white';
  selfRedirect?: boolean;
  containerId?: string; // defaults to element's id
};

let wechatScriptPromise: Promise<void> | null = null;

export function loadWeChatScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const win: any = window as any;
  if (win.WxLogin) return Promise.resolve();
  if (wechatScriptPromise) return wechatScriptPromise;
  wechatScriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
  return wechatScriptPromise;
}

export async function renderWeChatLogin(container: HTMLElement, opts: WeChatLoginOptions): Promise<void> {
  await loadWeChatScript();
  const win: any = window as any;
  if (!win.WxLogin || !container) return;
  try { container.innerHTML = ''; } catch {}
  const state = (opts.state ?? Math.random().toString(36).slice(2));
  try { sessionStorage.setItem('wx_oauth_state', state); } catch {}
  const id = (opts.containerId ?? (container.id || 'wx_login_container'));
  if (!container.id) container.id = id;
  new win.WxLogin({
    self_redirect: opts.selfRedirect ?? true,
    id,
    appid: opts.appId,
    scope: 'snsapi_login',
    redirect_uri: encodeURIComponent(opts.redirectUri),
    state,
    style: opts.style ?? 'black',
  });
}


