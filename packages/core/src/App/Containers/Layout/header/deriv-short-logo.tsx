import React from 'react';
import LOGO from '../../../Logo/LOGO9.png';

const DerivShortLogo = () => {
    return (
        <div className='header__menu-left-logo'>
                <img
                    src={LOGO}
                    alt='Deriv Short Logo'
                    style={{ height: '25px', width: 'auto' }}
                />
        </div>
    );
};

export default DerivShortLogo;