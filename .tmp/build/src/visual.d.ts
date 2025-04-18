import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
export declare class Visual implements IVisual {
    private target;
    private svg;
    private legend;
    private selectionIdBuilder;
    private events;
    private persistedProperties;
    private selectionManager;
    private container;
    private tableContainer;
    private allProperties;
    private visualHost;
    private xAxis;
    private yAxis;
    private formattingSettingsService;
    private margin;
    private previousSelection;
    private previousLegendSelection;
    private tableFontSize;
    private tableFontFamily;
    private tableFontBold;
    private tableFontUnderline;
    private tableFontItalic;
    private tableFontColor;
    private tableDisplayUnits;
    private tableSelectedCategory;
    private tableQueryName;
    private tableBorderColor;
    private tableBorderThickness;
    private fontSizeAll;
    private fontFamilyAll;
    private fontBoldAll;
    private fontUnderlineAll;
    private fontItalicAll;
    private fontColorAll;
    private displayUnitsPropertyAll;
    private barColor;
    private barSelectedCategory;
    private barTransparency;
    private barTransparencyAll;
    private barQueryName;
    private barColors;
    private useConditionalFormatting;
    private yAxisDisplayUnits;
    private yAxisMin;
    private yAxisMax;
    private yAxisFontSize;
    private yAxisFontFamily;
    private yAxisFontBold;
    private yAxisFontUnderline;
    private yAxisFontItalic;
    private yAxisFontColor;
    private xAxisFontSize;
    private xAxisFontFamily;
    private xAxisFontBold;
    private xAxisFontUnderline;
    private xAxisFontItalic;
    private xAxisFontColor;
    private lineColor;
    private lineSelectedCategory;
    private lineQueryName;
    private lineColors;
    private legendSeries;
    private legendPosition;
    private lineStyleAll;
    private lineStyle;
    private lineSizeAll;
    private lineSize;
    private markerSizeAll;
    private markerSize;
    private markerShapeAll;
    private markerShape;
    private dataLabelFontSize;
    private dataLabelFontFamily;
    private dataLabelFontBold;
    private dataLabelFontUnderline;
    private dataLabelFontItalic;
    private dataLabelFontColor;
    private dataLabelDisplayUnits;
    private dataLabelSelectedCategory;
    private dataLabelQueryName;
    private dataLabelsSeries;
    private dataLabelFontSizeAll;
    private dataLabelFontFamilyAll;
    private dataLabelFontBoldAll;
    private dataLabelFontUnderlineAll;
    private dataLabelFontItalicAll;
    private dataLabelFontColorAll;
    private dataLabelDisplayUnitsPropertyAll;
    private tooltipService;
    private categorySelection;
    private selectedDataPoint;
    private totalBars;
    private totalLines;
    private totalTableRows;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    removeElements(): void;
    getDataPoints(role: any): any;
    getFormattingModel(): powerbi.visuals.FormattingModel;
    getFormattingCard(description: any, displayName: any, uid: any, groups: any): powerbi.visuals.FormattingCard;
    getFormattingGroup(displayName: any, uid: any, slices: any): powerbi.visuals.FormattingGroup;
    getFormattingSlice(type: any, uid: any, displayName: any, objectName: any, propertyName: any, selector: any, value: any): powerbi.visuals.FormattingSlice;
    private fontProperties;
    private addConditionalFormattingOptions;
    private getGradientColor;
    private getRules;
    private fontSlice;
    private getAllSeries;
    private handleClick;
    private resetSelection;
    private styleElement;
    private filterProperty;
    private getPropertyValue;
    private formatValue;
    private getAutoNumber;
    getProperty<T>(objects: any, object: any, property: any, defaultValue: any): T;
    private handleContextMenu;
    private getMarkerShape;
    private formatDataLabelText;
    private persistState;
}
