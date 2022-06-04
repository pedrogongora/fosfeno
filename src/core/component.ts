export interface Component {}

export interface ComponentClassName<T extends Component> {
  name: string
  prototype: object
}
