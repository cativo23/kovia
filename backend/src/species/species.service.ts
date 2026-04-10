import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpeciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.species.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { animals: true } },
      },
    });
  }

  async findById(id: string) {
    const species = await this.prisma.species.findUnique({
      where: { id },
      include: {
        _count: { select: { animals: true } },
      },
    });

    if (!species) {
      throw new NotFoundException(`Species with ID ${id} not found`);
    }

    return species;
  }

  async create(data: { name: string }) {
    const slug = this.slugify(data.name);

    try {
      return await this.prisma.species.create({
        data: {
          name: data.name,
          slug,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          `Species with name "${data.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, data: { name: string }) {
    await this.findById(id);
    const slug = this.slugify(data.name);

    try {
      return await this.prisma.species.update({
        where: { id },
        data: {
          name: data.name,
          slug,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          `Species with name "${data.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async delete(id: string) {
    const species = await this.prisma.species.findUnique({
      where: { id },
      include: {
        _count: { select: { animals: true } },
      },
    });

    if (!species) {
      throw new NotFoundException(`Species with ID ${id} not found`);
    }

    if (species._count.animals > 0) {
      throw new ConflictException(
        `Cannot delete species "${species.name}" because it has ${species._count.animals} animals associated`,
      );
    }

    return this.prisma.species.delete({
      where: { id },
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
