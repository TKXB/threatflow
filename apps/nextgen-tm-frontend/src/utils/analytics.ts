/**
 * Google Analytics 工具模块
 * 封装 GA4 事件追踪函数
 */

// 声明全局 gtag 函数类型
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

/**
 * 追踪页面浏览
 * @param page - 页面路径或名称（如 "/threat-modeling", "/attack-path"）
 */
export function trackPageView(page: string): void {
  if (typeof window === 'undefined' || !window.gtag) {
    console.debug('[Analytics] gtag not available, skipping page view:', page);
    return;
  }

  try {
    window.gtag('event', 'page_view', {
      page_path: page,
      page_title: document.title,
    });
    console.debug('[Analytics] Page view tracked:', page);
  } catch (error) {
    console.error('[Analytics] Error tracking page view:', error);
  }
}

/**
 * 追踪用户交互事件
 * @param category - 事件类别（如 "ThreatModeling", "AttackPath"）
 * @param action - 事件动作（如 "Export", "Save", "AI Analysis"）
 * @param label - 事件标签（可选，如 "OTM", "Threagile"）
 * @param value - 事件值（可选，数字）
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    console.debug('[Analytics] gtag not available, skipping event:', {
      category,
      action,
      label,
    });
    return;
  }

  try {
    const eventParams: Record<string, any> = {
      event_category: category,
      event_label: label,
    };

    if (typeof value === 'number') {
      eventParams.value = value;
    }

    window.gtag('event', action, eventParams);
    console.debug('[Analytics] Event tracked:', {
      category,
      action,
      label,
      value,
    });
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
}

