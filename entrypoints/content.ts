import CommentApp from '@/contents/components/CommentApp';
import '@/contents/components/CommentSection.css';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

// 타겟 요소 찾기 함수
function findTargetElement(): HTMLElement | null {
    let targetElement: HTMLElement | null = null;

    // 방법 1: XPath 사용
    try {
        const xpath = '/html/body/div[1]/section[2]';
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        targetElement = result.singleNodeValue as HTMLElement;
    } catch (e) {
        console.log('🦑 XPath 실패, 다른 방법 시도');
    }

    // 방법 2: section 태그 찾기
    if (!targetElement) {
        const sections = document.querySelectorAll('section');
        if (sections.length >= 2) {
            targetElement = sections[1] as HTMLElement;
        }
    }

    // 방법 3: body의 두 번째 div 찾기
    if (!targetElement) {
        const bodyChildren = Array.from(document.body.children);
        if (bodyChildren.length > 0) {
            const firstDiv = bodyChildren[0];
            const sections = firstDiv.querySelectorAll('section');
            if (sections.length >= 2) {
                targetElement = sections[1] as HTMLElement;
            }
        }
    }

    // 방법 4: 모든 메인 콘텐츠 영역 찾기
    if (!targetElement) {
        targetElement =
            (document.querySelector('main') as HTMLElement) ||
            (document.querySelector('[role="main"]') as HTMLElement) ||
            (document.querySelector('.main-content') as HTMLElement) ||
            document.body;
    }

    return targetElement;
}

// 타겟 요소 찾기 (리트라이 로직 포함)
function findTargetElementWithRetry(
    maxRetries: number = 10,
    retryInterval: number = 500,
    timeout: number = 10000
): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let retryCount = 0;

        const tryFind = () => {
            // 타임아웃 체크
            if (Date.now() - startTime > timeout) {
                console.warn('🦑 타겟 요소 찾기 타임아웃, body에 마운트합니다.');
                resolve(document.body);
                return;
            }

            const element = findTargetElement();

            // 타겟 요소를 찾았고 body가 아닌 경우
            if (element && element !== document.body) {
                console.log('🦑 타겟 요소 찾기 성공:', element, `(시도: ${retryCount + 1})`);
                resolve(element);
                return;
            }

            retryCount++;

            // 최대 재시도 횟수 체크
            if (retryCount >= maxRetries) {
                console.warn(`🦑 타겟 요소를 ${maxRetries}회 시도 후 찾지 못했습니다. body에 마운트합니다.`);
                resolve(document.body);
                return;
            }

            // 다음 시도 예약
            setTimeout(tryFind, retryInterval);
        };

        // MutationObserver를 사용하여 DOM 변경 감지
        const observer = new MutationObserver(() => {
            const element = findTargetElement();
            if (element && element !== document.body) {
                console.log('🦑 MutationObserver로 타겟 요소 발견:', element);
                observer.disconnect();
                resolve(element);
            }
        });

        // body를 관찰 대상으로 설정
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // 즉시 첫 시도
        tryFind();

        // 타임아웃 설정
        setTimeout(() => {
            observer.disconnect();
            const element = findTargetElement();
            if (element) {
                resolve(element);
            } else {
                resolve(document.body);
            }
        }, timeout);
    });
}

// @ts-ignore
export default defineContentScript({
    // app.memex.xyz 도메인에만 실행
    matches: [
        'https://app.memex.xyz/*',
        'http://app.memex.xyz/*', // 개발 환경용
    ],
    // @ts-ignore
    async main(ctx) {
        console.log('🦑 Squid Meme Content Script 시작', window.location.href);

        // 타겟 요소 찾기 (리트라이 로직 포함)
        const targetElement = await findTargetElementWithRetry(10, 500, 10000);

        // 타겟 요소에 스타일 적용
        if (targetElement && targetElement !== document.body) {
            targetElement.style.display = 'flex';
            targetElement.style.flexDirection = 'column';
            console.log('🦑 타겟 요소 스타일 적용 완료:', targetElement);
        }

        // createIntegratedUi를 사용하여 UI 생성
        // @ts-ignore
        const ui = createIntegratedUi(ctx, {
            position: 'inline',
            anchor: targetElement || 'body',
            // @ts-ignore
            onMount: (container: HTMLElement) => {
                console.log('🦑 UI 마운트 시작', {
                    containerId: container.id,
                    containerParent: container.parentElement?.tagName,
                });

                // 컨테이너 스타일 적용
                container.id = 'squid-meme-comment-root';
                container.style.marginTop = '20px';
                container.style.marginLeft = '20px';
                container.style.marginRight = '20px';
                container.style.marginBottom = '20px';
                container.style.zIndex = '9999';
                container.style.position = 'relative';
                container.style.minHeight = '100px';
                container.style.width = '100%';
                container.setAttribute('data-squid-meme', 'true');

                // React root 생성 및 컴포넌트 렌더링
                try {
                    const root: Root = createRoot(container);
                    root.render(React.createElement(CommentApp));
                    console.log('🦑 React 컴포넌트 렌더링 완료');
                    return root;
                } catch (error) {
                    console.error('❌ React 컴포넌트 렌더링 오류:', error);
                    container.innerHTML = `
                        <div style="padding: 20px; background: #ff4444; color: white; border: 2px solid #ff0000; font-family: monospace;">
                            <h3>Error Loading Comment Component</h3>
                            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
                            <pre>${error instanceof Error ? error.stack : ''}</pre>
                        </div>
                    `;
                    return null;
                }
            },
            // @ts-ignore
            onRemove: (root) => {
                console.log('🦑 UI 제거 시작');
                if (root) {
                    root.unmount();
                }
            },
        });

        // UI 마운트
        ui.mount();
    },
});
