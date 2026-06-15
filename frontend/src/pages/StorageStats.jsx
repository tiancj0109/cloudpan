import React, { useState, useEffect } from 'react';
import { Card, Progress, Statistic, Row, Col, Grid } from 'antd';
import api from '../utils/api';

const StorageStats = () => {
    const [stats, setStats] = useState(null);
    const screens = Grid.useBreakpoint();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/quota/info');
            if (res.code === 200) {
                setStats(res.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (!stats) return <div>加载中...</div>;

    const percent = ((stats.usedSpace / stats.totalQuota) * 100).toFixed(2);
    const usedGB = (stats.usedSpace / 1024 / 1024 / 1024).toFixed(2);
    const totalGB = (stats.totalQuota / 1024 / 1024 / 1024).toFixed(2);



    return (
        <div>
            <h2>存储统计</h2>
            <Row gutter={[16, 16]}>
                <Col span={screens.md ? 12 : 24}>
                    <Card>
                        <Statistic title="已用空间" value={usedGB} suffix="GB" />
                    </Card>
                </Col>
                <Col span={screens.md ? 12 : 24}>
                    <Card>
                        <Statistic title="总配额" value={totalGB} suffix="GB" />
                    </Card>
                </Col>
            </Row>
            <Card style={{ marginTop: 20 }} title="使用情况">
                <Progress percent={percent} status="active" />
                <div style={{ marginTop: 10 }}>
                    已用 {usedGB} GB / 总共 {totalGB} GB
                </div>
            </Card>
        </div>
    );
};

export default StorageStats;
