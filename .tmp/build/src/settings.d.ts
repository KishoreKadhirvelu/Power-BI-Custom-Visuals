import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
/**
 * Data Point Formatting Card
 */
declare class DataPointCardSettings extends FormattingSettingsCard {
    defaultColor: formattingSettings.ColorPicker;
    showAllDataPoints: formattingSettings.ToggleSwitch;
    fill: formattingSettings.ColorPicker;
    fillRule: formattingSettings.ColorPicker;
    fontSize: formattingSettings.NumUpDown;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
declare class ValuesCardSetting extends formattingSettings.SimpleCard {
    show: formattingSettings.ToggleSwitch;
    topLevelSlice: formattingSettings.ToggleSwitch;
    name: string;
    displayName: string;
}
/**
* visual settings model class
*
*/
export declare class VisualFormattingSettingsModel extends FormattingSettingsModel {
    dataPointCard: DataPointCardSettings;
    cards: DataPointCardSettings[];
}
export declare class VisualSettingsModel extends formattingSettings.Model {
    values: ValuesCardSetting;
    cards: formattingSettings.SimpleCard[];
}
export {};
