import React, { useEffect, useState } from 'react';
import { getSavedWorkspaces } from '@deriv/bot-skeleton';
import { Text, Icon } from '@deriv/components';
import { observer, useStore } from '@deriv/stores';
import { Localize } from '@deriv/translations';
import { useDBotStore } from 'Stores/useDBotStore';
import RecentWorkspace from '../dashboard/bot-list/recent-workspace';
import styles from './botlist.module.scss';

const DashboardBotList = observer(() => {
    const { load_modal } = useDBotStore();
    const { ui } = useStore();
    const { is_mobile } = ui;
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isHoveringTitle, setIsHoveringTitle] = useState(false);

    useEffect(() => {
        const loadStrategies = async () => {
            setIsLoading(true);
            const strategies = await getSavedWorkspaces();
            load_modal.setDashboardStrategies(strategies);
            setTimeout(() => setIsLoading(false), 800);
        };
        loadStrategies();
    }, []);

    const filteredBots = load_modal.dashboard_strategies?.filter(bot =>
        bot.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.dashboard}>
            <div className={styles.particles}>
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className={styles.particle}
                        style={{
                            '--size': `${Math.random() * 6 + 3}px`,
                            '--x': `${Math.random() * 100}%`,
                            '--y': `${Math.random() * 100}%`,
                            '--delay': `${Math.random() * 5}s`,
                            '--duration': `${Math.random() * 15 + 10}s`,
                            '--color': `hsl(${Math.random() * 60 + 200}, 80%, 70%)`
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            <div className={styles.container}>
                <div className={styles.header}>
                    <div
                        className={styles.titleContainer}
                        onMouseEnter={() => setIsHoveringTitle(true)}
                        onMouseLeave={() => setIsHoveringTitle(false)}
                    >
                        <h1 className={styles.title}>
                            <span className={`${styles.titleText} ${isHoveringTitle ? styles.titleHover : ''}`}>
                                <Localize i18n_default_text="Bot Collection" />
                            </span>
                            <span className={`${styles.emoji} ${isHoveringTitle ? styles.emojiHover : ''}`}>
                                🤖
                            </span>
                        </h1>
                        <p className={styles.subtitle}>
                            <Localize i18n_default_text="Manage your automated trading strategies" />
                        </p>
                    </div>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loader}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className={styles.skeletonCard}>
                                    <div className={styles.skeletonImage} />
                                    <div className={styles.skeletonText} />
                                    <div className={styles.skeletonTextSm} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {filteredBots?.length > 0 ? (
                                <div className={styles.grid}>
                                    {filteredBots.map((workspace, index) => (
                                        <RecentWorkspace
                                            key={workspace.id}
                                            workspace={workspace}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.empty}>
                                    <div className={styles.emptyIcon}>
                                        <Icon icon="IcBox" size={is_mobile ? 48 : 64} />
                                    </div>
                                    <Text as="h3" weight="bold" align="center">
                                        <Localize i18n_default_text="No bots found" />
                                    </Text>
                                    <Text as="p" size="xs" align="center" color="less-prominent">
                                        {searchTerm ? (
                                            <Localize i18n_default_text="Try a different search term" />
                                        ) : (
                                            <Localize i18n_default_text="Create your first bot to get started" />
                                        )}
                                    </Text>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

export default DashboardBotList;