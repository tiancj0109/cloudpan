import { useEffect } from 'react';

const usePageNotification = (count) => {
    useEffect(() => {
        const totalUnread = count || 0;

        // 1. Update Title
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) CloudPan - 存聊`;
        } else {
            document.title = 'CloudPan - 存聊';
        }

        // 2. Update Favicon
        const setFavicon = (num) => {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.src = 'cloudpan/favicon.png';
            img.onload = () => {
                ctx.drawImage(img, 0, 0, 32, 32);
                if (num > 0) {
                    // Draw red badge
                    ctx.beginPath();
                    // Position: Top-right, slightly overlapping
                    ctx.arc(24, 8, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ff4d4f';
                    ctx.fill();

                    // Optional: White border for better separation
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#ffffff';
                    ctx.stroke();

                    // Draw count
                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const text = num > 99 ? '99+' : num.toString();
                    ctx.fillText(text, 24, 8);
                }

                let link = document.querySelector("link[rel*='icon']");
                if (link) {
                    document.head.removeChild(link);
                }
                link = document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'shortcut icon';
                link.href = canvas.toDataURL('image/x-icon');
                document.getElementsByTagName('head')[0].appendChild(link);
            };
        };

        setFavicon(totalUnread);

        // Cleanup function to reset favicon if component unmounts? 
        // Actually, we probably want to keep the state until it changes.
        // But if we navigate away from a page using this hook to one that doesn't, 
        // we might want to reset. However, MainLayout is always present, so it should be fine.

    }, [count]);
};

export default usePageNotification;
