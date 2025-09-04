import React, { useState } from 'react';
import { Text } from '@deriv/components';
import { Localize } from '@deriv/translations';
import { useDevice } from '@deriv-com/ui';
import './disclaimer.scss';

const Disclaimer = () => {
    const { isDesktop } = useDevice();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="disclaimer">
            {/* Button to open disclaimer */}
            <button
                className="disclaimer__button"
                onClick={() => setIsOpen(true)}
            >
                Risk Disclaimer!
            </button>

            {/* Popup modal */}
            {isOpen && (
                <div className="disclaimer__overlay">
                    <div className="disclaimer__popup">
                        <button
                            className="disclaimer__close"
                            onClick={() => setIsOpen(false)}
                        >
                            ✕
                        </button>
                        <Text
                            align="left"
                            className="disclaimer__text"
                            size={!isDesktop ? 'xxxs' : 'xs'}
                        >
                            <Localize i18n_default_text='The products offered on our website are complex derivative products that carry a significant risk of potential loss. CFDs are complex instruments with a high risk of losing money rapidly due to leverage. 72% of retail investor accounts lose money when trading CFDs with this provider. You should consider whether you understand how these products work and whether you can afford to take the high risk of losing your money.' />
                        </Text>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Disclaimer;
