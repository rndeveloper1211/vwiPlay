import React from 'react';
import { View, Image } from 'react-native';
import FastImage from 'react-native-fast-image';
import { IMAGE_BASE_URL } from '../../../utils/network/urls';

const Refund = ({ size, color }) => {
    return (
        <View
            style={{
                width: size,
                height: size,
                backgroundColor: color,
                borderRadius: 50,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <FastImage
                style={{ height: size * 0.9, width: size * 0.5 }}
                // source={require('../../drawer/assets/refund.png')}
                source={{
                    priority:'high',
                    uri:`${IMAGE_BASE_URL}refund.png`}}
                resizeMode="contain"
            />
        </View>
    );
};

export default Refund;
