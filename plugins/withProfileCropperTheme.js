const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
  withStringsXml,
} = require('@expo/config-plugins');

const CROP_COLORS = {
  expoCropToolbarColor: '#111827',
  expoCropToolbarIconColor: '#FFFFFF',
  expoCropToolbarActionTextColor: '#FFFFFF',
  expoCropBackButtonIconColor: '#FFFFFF',
  expoCropBackgroundColor: '#FFFFFF',
};

const addCropColors = (config, mod) => mod(config, (modConfig) => {
  Object.entries(CROP_COLORS).forEach(([name, value]) => {
    modConfig.modResults = AndroidConfig.Colors.assignColorValue(
      modConfig.modResults,
      { name, value },
    );
  });
  return modConfig;
});

module.exports = function withProfileCropperTheme(config) {
  config = addCropColors(config, withAndroidColors);
  config = addCropColors(config, withAndroidColorsNight);
  config = withAndroidStyles(config, (modConfig) => {
    Object.entries(CROP_COLORS).forEach(([name, value]) => {
      modConfig.modResults = AndroidConfig.Styles.assignStylesValue(
        modConfig.modResults,
        {
          add: true,
          parent: AndroidConfig.Styles.getAppThemeGroup(),
          name,
          value,
        },
      );
    });
    return modConfig;
  });

  return withStringsXml(config, (modConfig) => {
    modConfig.modResults = AndroidConfig.Strings.setStringItem([
      AndroidConfig.Resources.buildResourceItem({
        name: 'crop_image_menu_crop',
        value: 'SAVE',
        translatable: false,
      }),
    ], modConfig.modResults);
    return modConfig;
  });
};

