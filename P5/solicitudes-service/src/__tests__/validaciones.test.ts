import test from "node:test";
import assert from "node:assert/strict";
import { validarNuevaSolicitud, esPrioridadValida } from "../domain/validaciones";
import { NuevaSolicitud } from "../domain/Solicitud";

test("esPrioridadValida: acepta solo las prioridades del dominio", () => {
  assert.equal(esPrioridadValida("alta"), true);
  assert.equal(esPrioridadValida("urgente"), false);
});

test("validarNuevaSolicitud: no reporta errores con datos correctos", () => {
  const solicitud: NuevaSolicitud = {
    titulo: "Compra de laptops",
    areaSolicitante: "TI",
    prioridad: "media",
    costoEstimado: 15000,
    creadaPor: "mgarcia",
  };
  assert.deepEqual(validarNuevaSolicitud(solicitud), []);
});

test("validarNuevaSolicitud: reporta titulo vacio, prioridad invalida y costo negativo", () => {
  const solicitud = {
    titulo: "",
    areaSolicitante: "TI",
    prioridad: "urgente",
    costoEstimado: -10,
    creadaPor: "mgarcia",
  } as unknown as NuevaSolicitud;

  const errores = validarNuevaSolicitud(solicitud);
  assert.equal(errores.length, 3);
});
