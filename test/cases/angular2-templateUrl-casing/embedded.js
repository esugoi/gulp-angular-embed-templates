@Component({
    selector: "my-component",
    template: '<child  *ngFor="let child of children"> <custom-element [prop1Case]="child.Value", prop2="value" /> </child>',
    directives: [ROUTER_DIRECTIVES]
})