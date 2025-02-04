import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;

export interface IProperty {
    queryName : string,
    displayName: string,
    format: string,
    fontSize : number,
    fontFamily : string,
    fontBold : boolean,
    fontUnderline : boolean,
    fontItalic : boolean,
    fontColor : string,
    displayUnitsProperty : number,
    barColor : string,
    barTransparency : number,
    lineColor: string,
    tableSelection: boolean,
    data: powerbi.PrimitiveValue[],
    category: powerbi.PrimitiveValue[],
    role: string
}

export interface ICategorySelection{
    category: powerbi.PrimitiveValue,
    queryName: string,
    selection: ISelectionId
}

export interface IDropdown {
    displayName: string,
    value: string
}

export interface IDataPoint{
    name: string,
    value: number
}